use futures::future::BoxFuture;
use std::sync::Arc;

use super::f_channel_event::FChannelEvent;
use super::f_exception::FException;
use super::f_execution_context::FExecutionContext;

//Define callback type
pub type FChannelConsumerCallback<T, TResult> = Arc<
    dyn Fn(FExecutionContext, FChannelEvent<T>) -> BoxFuture<'static, Result<(), TResult>>
        + Send
        + Sync,
>;

pub trait FChannelConsumer<T> {
    fn add_handler(&mut self, cb: &FChannelConsumerCallback<T, FException>);
    fn remove_handler(&mut self, cb: &FChannelConsumerCallback<T, FException>);
}

#[cfg(test)]
mod tests {
    use crate::sync::{FChannelEventTrait, FExecutionContextTrait};

    use super::*;
    use std::any::Any;
    use std::sync::Mutex;

    pub struct MyExecutionContext {
        pub test: i16,
    }
    impl FExecutionContextTrait for MyExecutionContext {
        fn as_any(&self) -> &dyn Any {
            self
        }
    }

    pub struct MyChannelEvent<T> {
        payload: T,
    }
    impl<T: Send + Sync> FChannelEventTrait<T> for MyChannelEvent<T> {
        fn data(&self) -> &T {
            &self.payload
        }
    }

    #[derive(Default)]
    pub struct MyChannelConsumer<T> {
        handlers: Mutex<Vec<FChannelConsumerCallback<T, FException>>>,
    }

    impl<T> FChannelConsumer<T> for MyChannelConsumer<T> {
        fn add_handler(&mut self, cb: &FChannelConsumerCallback<T, FException>) {
            self.handlers.lock().unwrap().push(Arc::clone(cb));
        }

        fn remove_handler(&mut self, cb: &FChannelConsumerCallback<T, FException>) {
            self.handlers
                .lock()
                .unwrap()
                .retain(|existing| !Arc::ptr_eq(existing, cb));
        }
    }

    impl<T: Clone + Send + Sync + 'static> MyChannelConsumer<T> {
        pub fn create_publisher() -> F {
            Self {
                handlers: Mutex::new(Vec::new()),
            }
        }

        pub async fn notify(&self, payload: T) {
            println!("Notify execution ...");

            // Клонуємо список у критичній секції, щоб швидко відпустити м'ютекс
            let handlers: Vec<_> = self.handlers.lock().unwrap().clone();

            let ex = Arc::new(MyExecutionContext { test: -1 });

            for handler in handlers {
                let my_event = Arc::new(MyChannelEvent {
                    payload: payload.clone(),
                });

                handler(ex.clone(), my_event).await.expect("");
            }
        }
    }

    #[tokio::test]
    async fn test_async_subscribe() {
        // #[derive(Debug, Clone)]
        // struct MyError;
        // impl std::fmt::Display for MyError {
        //     fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        //         write!(f, "invalid first item to double")
        //     }
        // }
        // impl std::error::Error for MyError {}

        let mut channel = MyChannelConsumer::<i32>::default();

        let handler1_call_count = Arc::new(Mutex::new(0));
        let handler2_call_count = Arc::new(Mutex::new(0));

        let counter1 = Arc::clone(&handler1_call_count);
        let handler1: FChannelConsumerCallback<i32, FException> = Arc::new(move |ex, event| {
            let test = ex
                .as_any()
                .downcast_ref::<MyExecutionContext>()
                .unwrap()
                .test;
            let data = event.data().clone();
            let counter_ref = Arc::clone(&counter1);
            Box::pin(async move {
                *counter_ref.lock().unwrap() += 1;
                println!("Async Handler 1: {}, {}", data, test);
                Ok(())
            })
        });

        let counter2 = Arc::clone(&handler2_call_count);
        let handler2: FChannelConsumerCallback<i32, FException> = Arc::new(move |ex, event| {
            let test = ex
                .as_any()
                .downcast_ref::<MyExecutionContext>()
                .unwrap()
                .test;
            let data = event.data().clone();
            let counter_ref = Arc::clone(&counter2);
            Box::pin(async move {
                *counter_ref.lock().unwrap() += 1;
                println!("Async Handler 2: {}, {}", data, test);
                Ok(())
            })
        });

        channel.add_handler(&handler1);
        channel.add_handler(&handler2);

        println!("Notify 1");
        {
            let channel_clone_1 = channel.clone();
            tokio::task::spawn(async move { channel_clone_1.notify(42).await });
        }
        // channel_clone_1.notify(42).await;

        // Provide a little bit time to process notification in separate thread
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;

        channel.remove_handler(&handler1);

        println!("Notify 2");
        {
            let channel_clone_2 = channel.clone();
            tokio::task::spawn(async move { channel_clone_2.notify(100).await });
        }
        // channel_clone_2.notify(42).await;

        // Provide a little bit time to process notification in separate thread
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;

        assert_eq!(*handler1_call_count.lock().unwrap(), 1);
        assert_eq!(*handler2_call_count.lock().unwrap(), 2);
    }
}
