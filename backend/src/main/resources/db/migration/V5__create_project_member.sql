CREATE TABLE project_member (
    id         UUID        PRIMARY KEY,
    project_id UUID        NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    CONSTRAINT uq_project_member UNIQUE (project_id, user_id)
);
