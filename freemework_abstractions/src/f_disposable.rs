use std::pin::Pin;

pub type FDisposableInitRet<'a, TInitError> =
    Pin<Box<dyn Future<Output = Result<(), TInitError>> + 'a>>;

pub type FDisposableDisposeRet<'a> = Pin<Box<dyn Future<Output = ()> + 'a>>;

pub trait FDisposable {
    type InitError;

    fn init(&mut self) -> FDisposableInitRet<'_, Self::InitError> {
        Box::pin(async move { Ok(()) })
    }

    fn dispose(&mut self) -> FDisposableDisposeRet<'_> {
        Box::pin(async move {})
    }
}
