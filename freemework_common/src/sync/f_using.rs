use std::fmt::{self, Debug, Display, Formatter};
use std::pin::Pin;
use std::sync::Arc;

use freemework_abstractions::sync::FDisposable;

pub type FUsingWorkerFutureLegacy<'a, TRet, TErr> =
    Pin<Box<dyn Future<Output = Result<TRet, TErr>> + Send + 'a>>;
pub type FUsingWorkerFuture<TRet, TErr> = Pin<Box<dyn Future<Output = Result<TRet, TErr>> + Send>>;

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
/// f_using(&mut MyDisposable::new(), |disposable| {
///     Box::pin(async move {
///         disposable.dowork().await;
///     })
/// })
/// .await;
/// ```
///
pub async fn f_using_legacy<TDisposable, TWorkerFun, TWorkerRet, TWorkerErr>(
    disposable: &mut TDisposable,
    worker: TWorkerFun,
) -> Result<TWorkerRet, FUsingError<TDisposable::InitError, TWorkerErr>>
where
    TDisposable: FDisposable,
    TWorkerFun:
        for<'a> FnOnce(&'a mut TDisposable) -> FUsingWorkerFutureLegacy<'a, TWorkerRet, TWorkerErr>,
{
    let init_result = disposable.init().await;
    if let Err(init_error) = init_result {
        return Err(FUsingError::Init(init_error));
    }

    let worker_result = worker(disposable).await;
    disposable.dispose().await;
    match worker_result {
        Err(worker_error) => Err(FUsingError::Worker(worker_error)),
        Ok(worker_success) => Ok(worker_success),
    }
}

pub async fn f_using<TDisposable, TWorkerFun, TWorkerRet, TWorkerErr>(
    mut disposable: TDisposable,
    worker: TWorkerFun,
) -> Result<TWorkerRet, FUsingError<TDisposable::InitError, TWorkerErr>>
where
    TDisposable: FDisposable + Debug,
    TWorkerFun: FnOnce(Arc<TDisposable>) -> FUsingWorkerFuture<TWorkerRet, TWorkerErr>,
{
    disposable.init().await.map_err(FUsingError::Init)?;

    let disposable = Arc::new(disposable);

    let worker_result = worker(disposable.clone()).await;

    let mut disposable = Arc::try_unwrap(disposable).expect("worker still holds Arc references");

    disposable.dispose().await;

    worker_result.map_err(FUsingError::Worker)
}

#[macro_export]
macro_rules! f_using_multiple {
    // Базовий випадок для одного або кількох елементів
    ($worker:expr, $($disposable:expr),+ $(,)?) => {{
        async move {
            // 1. Ініціалізація всіх об'єктів по черзі
            $(
                if let Err(e) = $disposable.init().await {
                    return Err(FUsingError::Init(e));
                }
            )+

            // 2. Огортання в Arc
            $(
                let $disposable = std::sync::Arc::new($disposable);
            )+

            // 3. Виклик worker-а, передаємо клони Arc у вигляді кортежу
            let worker_result = $worker(($($disposable.clone()),+)).await;

            // 4. Розпакування Arc назад (перевірка на витоки) та деструкція
            $(
                let mut $disposable = std::sync::Arc::try_unwrap($disposable)
                    .expect("worker still holds Arc references");
                $disposable.dispose().await;
            )+

            worker_result.map_err(FUsingError::Worker)
        }
    }};
}
