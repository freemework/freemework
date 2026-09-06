use std::pin::Pin;

use freemework_abstractions::{FDisposable, FException};

pub type FUsingWorkerFuture<'a, TRet> =
    Pin<Box<dyn Future<Output = Result<TRet, FException>> + 'a>>;

///
/// ```text
/// let result = f_using(MyDisposable::new(), |disposable: &mut MyDisposable| -> FUsingWorkerFuture<u32>  {
///     Box::pin(async move {
///         disposable.dowork().await?;
/// 
///         Ok(42)
///     })
/// })
/// .await;
/// 
/// println!("Result: {}", result.unwrap()); // Output: Result: 42
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

    pub struct MyDisposable {
        test: u32,
    }
    impl MyDisposable {
        fn increment(&mut self) {
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
            |my_worker: &mut MyDisposable| -> FUsingWorkerFuture<u32> {
                Box::pin(async move {
                    // local scope
                    {
                        my_worker.test = 42;
                        my_worker.increment();
                    }

                    assert_eq!(my_worker.test, 43);

                    Ok(my_worker.test)
                })
            },
        )
        .await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 43);
    }
}
