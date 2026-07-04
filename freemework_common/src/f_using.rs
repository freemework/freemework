use std::fmt::{self, Debug, Display, Formatter};
use std::pin::Pin;

use freemework_abstractions::sync::FDisposable;

pub type FUsingWorkerFuture<'a, TRet, TErr> =
    Pin<Box<dyn Future<Output = Result<TRet, TErr>> + 'a>>;

#[derive(Debug)]
pub enum FUsingError<TInitError, TWorkerError = TInitError> {
    Init(TInitError),
    Worker(TWorkerError),
}

impl<TInitError, TWorkerError> Display for FUsingError<TInitError, TWorkerError>
where
    TInitError: Debug,
    TWorkerError: Debug,
{
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        match self {
            Self::Init(error) => write!(f, "init error: {error:?}"),
            Self::Worker(error) => write!(f, "worker error: {error:?}"),
        }
    }
}

///
/// ```text
/// f_using(MyDisposable::new(), |disposable| {
///     Box::pin(async move {
///         disposable.dowork().await;
///     })
/// })
/// .await;
/// ```
///
pub async fn f_using<TDisposable, TWorkerFun, TWorkerRet, TWorkerErr>(
    mut disposable: TDisposable,
    worker: TWorkerFun,
) -> Result<TWorkerRet, FUsingError<TDisposable::InitError, TWorkerErr>>
where
    TDisposable: FDisposable,
    TWorkerFun:
        for<'a> FnOnce(&'a mut TDisposable) -> FUsingWorkerFuture<'a, TWorkerRet, TWorkerErr>,
{
    let init_result = disposable.init().await;
    if let Err(init_error) = init_result {
        return Err(FUsingError::Init(init_error));
    }

    let worker_result = worker(&mut disposable).await;

    disposable.dispose().await;
    match worker_result {
        Err(worker_error) => Err(FUsingError::Worker(worker_error)),
        Ok(worker_success) => Ok(worker_success),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use freemework_abstractions::sync::FDisposable;

    pub enum MyDisposableError {}
    pub struct MyDisposable {
        test: u32,
    }
    impl MyDisposable {
        fn setup_local(&mut self) {
            self.test += 1;
        }
    }
    impl FDisposable for MyDisposable {
        type InitError = MyDisposableError;

        fn init(
            &mut self,
        ) -> freemework_abstractions::sync::FDisposableInitRet<'_, Self::InitError> {
            Box::pin(async move {
                //
                Ok(())
            })
        }

        fn dispose(&mut self) -> freemework_abstractions::sync::FDisposableDisposeRet<'_> {
            Box::pin(async move {
                //
            })
        }
    }
    impl std::fmt::Debug for MyDisposable {
        fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
            f.debug_struct("MyDisposable").finish()
        }
    }

    #[tokio::test]
    async fn test_f_using_1() {
        let result = f_using(
            MyDisposable { test: 12 },
            |my_worker: &mut MyDisposable| -> FUsingWorkerFuture<(), String> {
                Box::pin(async move {
                    // local scope
                    {
                        my_worker.test = 42;
                        my_worker.setup_local();
                    }

                    assert_eq!(my_worker.test, 43);

                    Ok(())
                })
            },
        )
        .await;

        assert!(result.is_ok());
    }
}
