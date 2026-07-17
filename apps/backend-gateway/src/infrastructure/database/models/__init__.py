"""
StadiumOS AI — ORM Models Package.

SQLAlchemy ORM models that map domain entities to PostgreSQL tables.
These models are INFRASTRUCTURE concerns — they know about SQLAlchemy
column types and relationships but do NOT contain business logic.

Business logic lives exclusively in the domain entities (src/domain/entities/).
ORM models are used only for database persistence and querying.
"""
