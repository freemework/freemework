use std::pin::Pin;

use freemework_abstractions::sync::FException;
use freemework_abstractions::sync::FDisposable;


pub type FUsingWorkerFuture<'a, TRet> =
    Pin<Box<dyn Future<Output = Result<TRet, FException>> + Send + 'a>>;

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
pub async fn f_using<TDisposable, TWorkerFun, TWorkerRet>(
    mut disposable: TDisposable,
    worker: TWorkerFun,
) -> Result<TWorkerRet, FException>
where
    TDisposable: FDisposable,
    TWorkerFun:
        for<'a> FnOnce(&'a mut TDisposable) -> FUsingWorkerFuture<'a, TWorkerRet>,
{
    disposable.init().await?;

    let worker_result = worker(&mut disposable).await;

    disposable.dispose().await;

    worker_result
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
