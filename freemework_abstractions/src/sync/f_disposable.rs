use futures::future::BoxFuture;

use super::f_exception::FException;

pub type FDisposableInitRet<'a> = BoxFuture<'a, Result<(), FException>>;
pub type FDisposableDisposeRet<'a> = BoxFuture<'a, ()>;

pub trait FDisposable {
    fn init(&mut self) -> FDisposableInitRet<'_> {
        Box::pin(async move { Ok(()) })
    }

    fn dispose(&mut self) -> FDisposableDisposeRet<'_> {
        Box::pin(async move {})
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use futures::future::BoxFuture;

    struct FakeDbConnection;
    impl FakeDbConnection {
        fn new() -> BoxFuture<'static, Self> {
            Box::pin(async move {
                // Simulate async initialization
                FakeDbConnection
            })
        }
    }

    pub struct FakeDbConnectionHandle {
        _init: Option<_FakeDbConnectionHandleInit>,
    }
    impl FakeDbConnectionHandle {
        fn new() -> Self {
            Self { _init: None }
        }
    }
    struct _FakeDbConnectionHandleInit {
        _db_connection: FakeDbConnection,
    }
    impl FDisposable for FakeDbConnectionHandle {
        fn init(&mut self) -> FDisposableInitRet<'_> {
            Box::pin(async move {
                let db_connection = FakeDbConnection::new().await;

                self._init = Some(_FakeDbConnectionHandleInit {
                    _db_connection: db_connection,
                });

                Ok(())
            })
        }

        fn dispose(&mut self) -> FDisposableDisposeRet<'_> {
            Box::pin(async move {
                self._init = None;
            })
        }
    }

    #[tokio::test]
    async fn test_channel_event_shoud_be_to_move() {
        let mut handle = FakeDbConnectionHandle::new();

        handle.init().await.unwrap();
        handle.dispose().await;
    }
}
