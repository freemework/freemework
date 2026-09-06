use futures::future::LocalBoxFuture;
use std::rc::Rc;

use super::f_channel_event::FChannelEvent;
use super::f_exception::FException;
use super::f_execution_context::FExecutionContext;

///
/// Define callback type
///
pub type FChannelSubscriberUnbreakableCallback<TEventArgs, THandlerException> = Rc<
    dyn Fn(
        FExecutionContext,
        FChannelEvent<TEventArgs>,
    ) -> LocalBoxFuture<'static, Result<(), THandlerException>>,
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
    use std::{any::Any, cell::RefCell};

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
    impl<TEventArgs> FChannelEventTrait<TEventArgs> for MyChannelEvent<TEventArgs> {
        fn data(&self) -> &TEventArgs {
            &self.data
        }
    }

    #[derive(Default)]
    pub struct MyChannelConsumer<TEventArgs> {
        handlers: RefCell<Vec<FChannelSubscriberUnbreakableCallback<TEventArgs, FException>>>,
    }
    impl<TEventArgs> FChannelSubscriberUnbreakable<TEventArgs> for MyChannelConsumer<TEventArgs> {
        fn add_handler(&self, cb: &FChannelSubscriberUnbreakableCallback<TEventArgs, FException>) {
            self.handlers.borrow_mut().push(Rc::clone(cb));
        }

        fn remove_handler(&self, cb: &FChannelSubscriberUnbreakableCallback<TEventArgs, FException>) {
            self.handlers
                .borrow_mut()
                .retain(|existing| !Rc::ptr_eq(existing, cb));
        }
    }
    impl<TEventArgs: Clone + 'static> MyChannelConsumer<TEventArgs> {
        pub async fn notify(
            &self,
            execution_context: FExecutionContext,
            data: TEventArgs,
        ) -> Result<(), FException> {
            // Клонуємо список обробників, щоб уникнути проблем із запозиченням під час await
            let handlers: Vec<_> = self.handlers.borrow().iter().cloned().collect();

            for handler in handlers {
                let my_event = Rc::new(MyChannelEvent { data: data.clone() });

                handler(execution_context.clone(), my_event).await?;
            }
            Ok(())
        }
    }

    #[tokio::test(flavor = "local")]
    async fn test_async_subscribe() {
        let channel = Rc::new(MyChannelConsumer::<i32>::default());

        let handler1_call_count = Rc::new(RefCell::new(0));
        let handler1_context_test_data = Rc::new(RefCell::new(0));
        let handler1_data_collect = Rc::new(RefCell::new(Vec::<i32>::new()));
        let handler2_call_count = Rc::new(RefCell::new(0));
        let handler2_context_test_data = Rc::new(RefCell::new(0));
        let handler2_data_collect = Rc::new(RefCell::new(Vec::<i32>::new()));

        let handler1: FChannelSubscriberUnbreakableCallback<i32, FException> = {
            let counter = handler1_call_count.clone();
            let data_collect = handler1_data_collect.clone();
            let context_test_data = handler1_context_test_data.clone();
            Rc::new(move |execution_context, event| {
                let counter_ref = Rc::clone(&counter);
                let data_collect = data_collect.clone();
                let context_test_data = Rc::clone(&context_test_data);
                Box::pin(async move {
                    *counter_ref.borrow_mut() += 1;
                    data_collect.borrow_mut().push(event.data().clone());
                    *context_test_data.borrow_mut() = execution_context
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
            Rc::new(move |execution_context, event| {
                let counter_ref = Rc::clone(&counter);
                let data_collect = data_collect.clone();
                let context_test_data = Rc::clone(&context_test_data);
                Box::pin(async move {
                    *counter_ref.borrow_mut() += 1;
                    data_collect.borrow_mut().push(event.data().clone());
                    *context_test_data.borrow_mut() = execution_context
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

        let execution_context = Rc::new(MyExecutionContext {
            context_test_data: -1,
        });

        // Notify in a local task to simulate async behavior
        {
            let channel_clone = channel.clone();
            let execution_context = execution_context.clone();
            let spawn_handle = tokio::task::spawn_local(async move {
                channel_clone.notify(execution_context, 42).await.unwrap();
            });
            spawn_handle.await.unwrap();
        }

        channel.remove_handler(&handler1);

        {
            let channel_clone = channel.clone();
            let execution_context = execution_context.clone();
            let spawn_handle = tokio::task::spawn_local(async move {
                channel_clone.notify(execution_context, 84).await.unwrap();
            });
            spawn_handle.await.unwrap();
        }

        assert_eq!(*handler1_call_count.borrow(), 1);
        assert_eq!(*handler2_call_count.borrow(), 2);

        assert_eq!(
            *handler1_context_test_data.borrow(),
            execution_context.context_test_data
        );
        assert_eq!(
            *handler2_context_test_data.borrow(),
            execution_context.context_test_data
        );

        assert_eq!(*handler1_data_collect.borrow(), vec![42]);
        assert_eq!(*handler2_data_collect.borrow(), vec![42, 84]);
    }
}
