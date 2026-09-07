use futures::future::LocalBoxFuture;

use super::f_exception::FException;

pub type FDisposableInitRet<'a> = LocalBoxFuture<'a, Result<(), FException>>;
pub type FDisposableDisposeRet<'a> = LocalBoxFuture<'a, ()>;

pub trait FDisposable {
    fn init(&mut self) -> FDisposableInitRet<'_> {
        Box::pin(async move { Ok(()) })
    }

    fn dispose(&mut self) -> FDisposableDisposeRet<'_> {
        Box::pin(async move {})
    }
}
