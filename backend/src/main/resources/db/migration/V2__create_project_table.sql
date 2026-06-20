CREATE TABLE project (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    color       VARCHAR(7),
    parent_id   UUID         REFERENCES project(id) ON DELETE CASCADE,
    owner_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_name_per_parent UNIQUE (owner_id, name, parent_id)
);
