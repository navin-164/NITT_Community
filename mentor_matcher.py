from neo4j import GraphDatabase
driver = GraphDatabase.driver(uri, auth=(user, pw))
def find_mentors(student_id):
    query = """
    MATCH (s:Student {id:$sid})-[:INTERESTED_IN]->(t:Topic)
    MATCH (mentor)-[:EXPERT_IN]->(t)
    WHERE mentor:Faculty OR mentor:Alumni
    RETURN mentor.id AS id, count(*) AS commonInterests
    ORDER BY commonInterests DESC LIMIT 5
    """
    with driver.session() as session:
        result = session.run(query, sid=student_id)
        return [(r["id"], r["commonInterests"]) for r in result]
