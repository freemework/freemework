use std::sync::Arc;

pub trait FChannelEventTrait<T: Send + Sync>: Send + Sync {
    fn data(&self) -> &T;
}

pub type FChannelEvent<T> = Arc<dyn FChannelEventTrait<T>>;

#[cfg(test)]
mod tests {
    use super::*;

    pub struct MyChannelEvent<T> {
        payload: T,
    }
    impl<T: Send + Sync> FChannelEventTrait<T> for MyChannelEvent<T> {
        fn data(&self) -> &T {
            &self.payload
        }
    }

    #[test]
    fn test_channel_event_shoud_be_to_move() {
        let event = MyChannelEvent { payload: 42 };

        let closure = move || event;
        // let closure2 = move || event;

        closure();
    }

    #[tokio::test]
    async fn test_channel_event_shoud_be_to_async_move() {
        let event = MyChannelEvent { payload: 42 };

        let closure = async move || event;
        // let closure2 = async move || event;

        closure().await;
    }

    #[tokio::test]
    async fn test_channel_event_shoud_be_able_to_pass_via_async_move() {
        let event = MyChannelEvent { payload: 42 };

        tokio::task::spawn(async move {
            let event_borrowed = event;
            println!("Payload: {}", event_borrowed.payload);
        });

        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    }
}
