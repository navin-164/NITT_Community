// Ensure User IDs are unique (Crucial for your MATCH queries)
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User)
REQUIRE u.user_id IS UNIQUE;

// Create Indexes for faster lookups
CREATE INDEX user_email_index IF NOT EXISTS
FOR (u:User)
ON (u.email);

CREATE INDEX topic_name_index IF NOT EXISTS
FOR (t:Topic)
ON (t.name);