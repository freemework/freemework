use std::future::Future;
use std::pin::Pin;
use std::rc::Rc;

use crate::{FChannelEvent, FExecutionContext};

// Thread unsafe version of BoxFuture (instead of futures::future::BoxFuture)
type BoxFuture<'a, T> = Pin<Box<dyn Future<Output = T> + 'a>>;

//Define callback type
pub type FChannelConsumerCallback<TEventArgs, TResult> = Rc<
    dyn Fn(FExecutionContext, FChannelEvent<TEventArgs>) -> BoxFuture<'static, Result<(), TResult>>,
>;

pub trait FChannelConsumer<TEventArgs> {
    type Error;

    fn add_handler(&self, cb: &FChannelConsumerCallback<TEventArgs, Self::Error>);
    fn remove_handler(&self, cb: &FChannelConsumerCallback<TEventArgs, Self::Error>);
}

#[cfg(test)]
mod tests {
    use crate::{FChannelEventTrait, FExecutionContextTrait};

    use super::*;
    use std::{any::Any, cell::RefCell};

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
    impl<T> FChannelEventTrait<T> for MyChannelEvent<T> {
        fn data(&self) -> &T {
            &self.payload
        }
    }

    #[derive(Default)]
    pub struct MyChannelConsumer<T> {
        handlers: RefCell<Vec<FChannelConsumerCallback<T, String>>>,
    }
    impl<T> FChannelConsumer<T> for MyChannelConsumer<T> {
        type Error = String;

        fn add_handler(&self, cb: &FChannelConsumerCallback<T, Self::Error>) {
            self.handlers.borrow_mut().push(Rc::clone(cb));
        }

        fn remove_handler(&self, cb: &FChannelConsumerCallback<T, Self::Error>) {
            self.handlers
                .borrow_mut()
                .retain(|existing| !Rc::ptr_eq(existing, cb));
        }
    }

    impl<T: Clone + 'static> MyChannelConsumer<T> {
        pub async fn notify(&self, payload: T) {
            // Клонуємо список обробників, щоб уникнути проблем із запозиченням RefCell під час await
            let handlers: Vec<_> = self.handlers.borrow().iter().cloned().collect();

            let ex = Rc::new(MyExecutionContext { test: 42 });

            for handler in handlers {
                let my_event = Rc::new(MyChannelEvent {
                    payload: payload.clone(),
                });

                handler(ex.clone(), my_event).await.unwrap();
            }
        }
    }

    #[tokio::test]
    async fn test_async_subscribe() {
        let channel = MyChannelConsumer::<i32>::default();

        let handler1_call_count = Rc::new(RefCell::new(0));
        let handler2_call_count = Rc::new(RefCell::new(0));

        let counter1 = Rc::clone(&handler1_call_count);
        let handler1: FChannelConsumerCallback<i32, String> = Rc::new(move |ex, event| {
            let test = ex
                .as_any()
                .downcast_ref::<MyExecutionContext>()
                .unwrap()
                .test;
            let data = event.data().clone();
            let counter_ref = Rc::clone(&counter1);
            Box::pin(async move {
                *counter_ref.borrow_mut() += 1;
                println!("Async Handler 1: {}, {}", data, test);
                Ok(())
            })
        });

        let counter2 = Rc::clone(&handler2_call_count);
        let handler2: FChannelConsumerCallback<i32, String> = Rc::new(move |ex, event| {
            let test = ex
                .as_any()
                .downcast_ref::<MyExecutionContext>()
                .unwrap()
                .test;
            let data = event.data().clone();
            let counter_ref = Rc::clone(&counter2);
            Box::pin(async move {
                *counter_ref.borrow_mut() += 1;
                println!("Async Handler 2: {}, {}", data, test);
                Ok(())
            })
        });

        channel.add_handler(&handler1);
        channel.add_handler(&handler2);

        println!("Notify 1");
        channel.notify(42).await;

        channel.remove_handler(&handler1);

        println!("Notify 2");
        channel.notify(100).await;

        assert_eq!(handler1_call_count.take(), 1);
        assert_eq!(handler2_call_count.take(), 2);
    }
}
