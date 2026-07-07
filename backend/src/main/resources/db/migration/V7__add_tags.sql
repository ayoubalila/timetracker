CREATE TABLE tag (
    id      UUID         NOT NULL PRIMARY KEY,
    name    VARCHAR(50)  NOT NULL,
    color   VARCHAR(7)   NOT NULL,
    owner_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (owner_id, name)
);

CREATE TABLE task_tag (
    tag_id  UUID NOT NULL REFERENCES tag(id)  ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
    PRIMARY KEY (tag_id, task_id)
);
