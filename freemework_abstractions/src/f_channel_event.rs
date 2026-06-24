use std::rc::Rc;

pub trait FChannelEventTrait<T> {
    fn data(&self) -> &T;
}

pub type FChannelEvent<T> = Rc<dyn FChannelEventTrait<T>>;

#[cfg(test)]
mod tests {
    use super::*;

    pub struct MyChannelEvent<T> {
        payload: T,
    }
    impl<T> FChannelEventTrait<T> for MyChannelEvent<T> {
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
}
