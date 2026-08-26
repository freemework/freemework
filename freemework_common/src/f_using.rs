use std::pin::Pin;

use freemework_abstractions::FException;
use freemework_abstractions::FDisposable;

pub type FUsingWorkerFuture<'a, TRet> =
    Pin<Box<dyn Future<Output = Result<TRet, FException>> + 'a>>;

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

#[cfg(test)]
mod tests {
    use super::*;

    pub enum MyDisposableError {}
    pub struct MyDisposable {
        test: u32,
    }
    impl MyDisposable {
        fn setup_local(&mut self) {
            self.test += 1;
        }
    }
    impl freemework_abstractions::FDisposable for MyDisposable {
        fn init(
            &mut self,
        ) -> freemework_abstractions::FDisposableInitRet<'_> {
            Box::pin(async move {
                //
                Ok(())
            })
        }

        fn dispose(&mut self) -> freemework_abstractions::FDisposableDisposeRet<'_> {
            Box::pin(async move {
                //
            })
        }
    }
    impl std::fmt::Debug for MyDisposable {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            f.debug_struct("MyDisposable").finish()
        }
    }

    #[tokio::test]
    async fn test_f_using_1() {
        let result = f_using(
            MyDisposable { test: 12 },
            |my_worker: &mut MyDisposable| -> FUsingWorkerFuture<()> {
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
