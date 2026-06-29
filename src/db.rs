use sqlx::PgPool;

pub async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::Error> {
    let sql = include_str!("../migrations/000001_initial.sql");
    sqlx::raw_sql(sql).execute(pool).await?;

    let sql2 = include_str!("../migrations/000002_api_keys.sql");
    sqlx::raw_sql(sql2).execute(pool).await?;

    let sql3 = include_str!("../migrations/000003_portfolio_integrations.sql");
    sqlx::raw_sql(sql3).execute(pool).await?;

    let sql4 = include_str!("../migrations/000004_password_resets.sql");
    sqlx::raw_sql(sql4).execute(pool).await?;

    Ok(())
}

