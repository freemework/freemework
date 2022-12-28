async function migration(executionContext, sqlConnection, log) {
	log.info(executionContext, __filename);
	await sqlConnection.statement(
		`INSERT INTO [topic] ([name], [description], [media_type], [topic_security], [publisher_security], [subscriber_security], [date_unix_create_date]) VALUES (?, ?, ?, ?, ?, ?, ?)`
	).execute(executionContext, 'migration.js', 'Market currency', 's', 's', 'd', 'as', Math.trunc(Date.now() / 1000));
}
