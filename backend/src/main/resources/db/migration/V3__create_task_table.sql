CREATE TABLE task (
    id          UUID          PRIMARY KEY,
    description VARCHAR(500),
    start_time  TIMESTAMP     NOT NULL,
    end_time    TIMESTAMP,
    owner_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
