use std::{any::Any, sync::Arc};

pub trait FExecutionContextTrait: Any + Send + Sync {
    fn as_any(&self) -> &dyn Any;
}

pub type FExecutionContext = Arc<dyn FExecutionContextTrait>;

#[cfg(test)]
mod tests {
    use super::*;

    pub struct MyExecutionContext {
        pub request_id: String,
    }
    impl FExecutionContextTrait for MyExecutionContext {
        fn as_any(&self) -> &dyn Any {
            self
        }
    }

    #[test]
    fn test_channel_event_shoud_be_to_move() {
        let ctx: Box<dyn FExecutionContextTrait> = Box::new(MyExecutionContext {
            request_id: "12345".to_string(),
        });

        let closure = move || {
            if let Some(my_ctx) = ctx.as_any().downcast_ref::<MyExecutionContext>() {
                println!(
                    "Успішно відновлено MyExecutionContext! ID: {}",
                    my_ctx.request_id
                );
            } else {
                assert!(false, "Не вдалося привести тип.");
            }
        };

        closure();
    }
}
