use std::pin::Pin;

use super::f_exception::FException;

pub type FDisposableInitRet<'a> =
    Pin<Box<dyn Future<Output = Result<(), FException>> + 'a>>;

pub type FDisposableDisposeRet<'a> = Pin<Box<dyn Future<Output = ()> + 'a>>;

pub trait FDisposable {
    fn init(&mut self) -> FDisposableInitRet<'_> {
        Box::pin(async move { Ok(()) })
    }

    fn dispose(&mut self) -> FDisposableDisposeRet<'_> {
        Box::pin(async move {})
    }
}
