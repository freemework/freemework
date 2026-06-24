use futures::future::BoxFuture;
use std::sync::Arc;

use crate::sync::{FChannelEvent, FExecutionContext};

//Define callback type
pub type FChannelConsumerCallback<T, TResult> = Arc<
    dyn Fn(FExecutionContext, FChannelEvent<T>) -> BoxFuture<'static, Result<(), TResult>>
        + Send
        + Sync,
>;

pub trait FChannelConsumer<T> {
    type Error;

    fn add_handler(&self, cb: &FChannelConsumerCallback<T, Self::Error>);
    fn remove_handler(&self, cb: &FChannelConsumerCallback<T, Self::Error>);
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
        handlers: Mutex<Vec<FChannelConsumerCallback<T, String>>>,
    }

    impl<T> FChannelConsumer<T> for MyChannelConsumer<T> {
        type Error = String;

        fn add_handler(&self, cb: &FChannelConsumerCallback<T, String>) {
            self.handlers.lock().unwrap().push(Arc::clone(cb));
        }

        fn remove_handler(&self, cb: &FChannelConsumerCallback<T, String>) {
            self.handlers
                .lock()
                .unwrap()
                .retain(|existing| !Arc::ptr_eq(existing, cb));
        }
    }

    impl<T: Clone + Send + Sync + 'static> MyChannelConsumer<T> {
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
        let channel = Arc::new(MyChannelConsumer::<i32>::default());

        let handler1_call_count = Arc::new(Mutex::new(0));
        let handler2_call_count = Arc::new(Mutex::new(0));

        let counter1 = Arc::clone(&handler1_call_count);
        let handler1: FChannelConsumerCallback<i32, String> = Arc::new(move |ex, event| {
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
        let handler2: FChannelConsumerCallback<i32, String> = Arc::new(move |ex, event| {
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
