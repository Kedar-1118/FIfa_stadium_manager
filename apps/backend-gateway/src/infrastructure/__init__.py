"""
StadiumOS AI — Infrastructure Layer Package.

The infrastructure layer contains concrete implementations of the abstract
ports defined in the application layer. This includes database repositories
(SQLAlchemy), cache clients (Redis), security utilities (JWT, password
hashing), and external service integrations.

Clean Architecture Principle:
    This layer depends on the domain and application layers. It implements
    the repository interfaces (ports) defined in the application layer,
    enabling dependency inversion — the application layer dictates the
    contract, and infrastructure fulfills it.
"""
