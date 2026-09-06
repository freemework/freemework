use futures::future::BoxFuture;
use std::sync::Arc;

use super::f_channel_event::FChannelEvent;
use super::f_exception::FException;
use super::f_execution_context::FExecutionContext;

///
/// Define callback type
///
pub type FChannelSubscriberUnbreakableCallback<TEventArgs, THandlerException> = Arc<
    dyn Fn(FExecutionContext, FChannelEvent<TEventArgs>) -> BoxFuture<'static, Result<(), THandlerException>>
        + Send
        + Sync,
>;

///
/// Define some kind of Publish-Subscribe pattern. See https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern
///
/// This is very similar to FChannelSubscriber but callback signature does not accept transporting Exception.
/// So there no cases for transporting exceptions from callback to publisher.
/// 
/// In another words: FChannelSubscriberUnbreakable is unbreakable channel version of FChannelSubscriber.
/// 
/// Use cases:
/// - Browser events (like click, mousemove, etc.)
/// - In-proc events
///
pub trait FChannelSubscriberUnbreakable<TEventArgs> {
    fn add_handler(&self, cb: &FChannelSubscriberUnbreakableCallback<TEventArgs, FException>);
    fn remove_handler(&self, cb: &FChannelSubscriberUnbreakableCallback<TEventArgs, FException>);
}

#[cfg(test)]
mod tests {
    use super::super::{FChannelEventTrait, FExecutionContextTrait};

    use super::*;
    use std::{any::Any, sync::Mutex};

    pub struct MyExecutionContext {
        pub context_test_data: i16,
    }
    impl FExecutionContextTrait for MyExecutionContext {
        fn as_any(&self) -> &dyn Any {
            self
        }
    }

    pub struct MyChannelEvent<TEventArgs> {
        data: TEventArgs,
    }
    impl<TEventArgs: Send + Sync> FChannelEventTrait<TEventArgs> for MyChannelEvent<TEventArgs> {
        fn data(&self) -> &TEventArgs {
            &self.data
        }
    }

    #[derive(Default)]
    pub struct MyChannelConsumer<TEventArgs> {
        handlers: Mutex<Vec<FChannelSubscriberUnbreakableCallback<TEventArgs, FException>>>,
    }
    impl<TEventArgs> FChannelSubscriberUnbreakable<TEventArgs> for MyChannelConsumer<TEventArgs> {
        fn add_handler(&self, cb: &FChannelSubscriberUnbreakableCallback<TEventArgs, FException>) {
            self.handlers.lock().unwrap().push(Arc::clone(cb));
        }

        fn remove_handler(&self, cb: &FChannelSubscriberUnbreakableCallback<TEventArgs, FException>) {
            self.handlers
                .lock()
                .unwrap()
                .retain(|existing| !Arc::ptr_eq(existing, cb));
        }
    }
    impl<TEventArgs: Clone + Send + Sync + 'static> MyChannelConsumer<TEventArgs> {
        pub async fn notify(
            &self,
            execution_context: FExecutionContext,
            data: TEventArgs,
        ) -> Result<(), FException> {
            // Клонуємо список обробників, щоб уникнути проблем із запозиченням під час await
            let handlers: Vec<_> = self.handlers.lock().unwrap().clone();

            for handler in handlers {
                let my_event = Arc::new(MyChannelEvent { data: data.clone() });

                handler(execution_context.clone(), my_event).await?;
            }
            Ok(())
        }
    }

    #[tokio::test(flavor = "current_thread")]
    async fn test_async_subscribe() {
        let channel = Arc::new(MyChannelConsumer::<i32>::default());

        let handler1_call_count = Arc::new(Mutex::new(0));
        let handler1_context_test_data = Arc::new(Mutex::new(0));
        let handler1_data_collect = Arc::new(Mutex::new(Vec::<i32>::new()));
        let handler2_call_count = Arc::new(Mutex::new(0));
        let handler2_context_test_data = Arc::new(Mutex::new(0));
        let handler2_data_collect = Arc::new(Mutex::new(Vec::<i32>::new()));

        let handler1: FChannelSubscriberUnbreakableCallback<i32, FException> = {
            let counter = handler1_call_count.clone();
            let data_collect = handler1_data_collect.clone();
            let context_test_data = handler1_context_test_data.clone();
            Arc::new(move |execution_context, event| {
                let counter_ref = Arc::clone(&counter);
                let data_collect = data_collect.clone();
                let context_test_data = Arc::clone(&context_test_data);
                Box::pin(async move {
                    *counter_ref.lock().unwrap() += 1;
                    data_collect.lock().unwrap().push(event.data().clone());
                    *context_test_data.lock().unwrap() = execution_context
                        .as_any()
                        .downcast_ref::<MyExecutionContext>()
                        .unwrap()
                        .context_test_data;
                    Ok(())
                })
            })
        };

        let handler2: FChannelSubscriberUnbreakableCallback<i32, FException> = {
            let counter = handler2_call_count.clone();
            let data_collect = handler2_data_collect.clone();
            let context_test_data = handler2_context_test_data.clone();
            Arc::new(move |execution_context, event| {
                let counter_ref = Arc::clone(&counter);
                let data_collect = data_collect.clone();
                let context_test_data = Arc::clone(&context_test_data);
                Box::pin(async move {
                    *counter_ref.lock().unwrap() += 1;
                    data_collect.lock().unwrap().push(event.data().clone());
                    *context_test_data.lock().unwrap() = execution_context
                        .as_any()
                        .downcast_ref::<MyExecutionContext>()
                        .unwrap()
                        .context_test_data;
                    Ok(())
                })
            })
        };

        channel.add_handler(&handler1);
        channel.add_handler(&handler2);

        let execution_context = Arc::new(MyExecutionContext {
            context_test_data: -1,
        });

        // Notify in a separate thread to simulate async behavior
        {
            let channel_clone = channel.clone();
            let execution_context = execution_context.clone();
            let spawn_handle = tokio::task::spawn(async move {
                channel_clone.notify(execution_context, 42).await.unwrap();
            });
            spawn_handle.await.unwrap();
        }

        channel.remove_handler(&handler1); // Remove handler1 to test that it is not called again

        // Notify in a separate thread to simulate async behavior
        {
            let channel_clone = channel.clone();
            let execution_context = execution_context.clone();
            let spawn_handle = tokio::task::spawn(async move {
                channel_clone.notify(execution_context, 84).await.unwrap();
            });
            spawn_handle.await.unwrap();
        }

        assert_eq!(*handler1_call_count.lock().unwrap(), 1); // handler1 should have been called only once due to removal
        assert_eq!(*handler2_call_count.lock().unwrap(), 2);

        assert_eq!(
            *handler1_context_test_data.lock().unwrap(),
            execution_context.context_test_data
        );
        assert_eq!(
            *handler2_context_test_data.lock().unwrap(),
            execution_context.context_test_data
        );

        assert_eq!(*handler1_data_collect.lock().unwrap(), vec![42]);
        assert_eq!(*handler2_data_collect.lock().unwrap(), vec![42, 84]);
    }
}
