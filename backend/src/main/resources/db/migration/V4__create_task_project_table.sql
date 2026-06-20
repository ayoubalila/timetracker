CREATE TABLE task_project (
    task_id    UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, project_id)
);
