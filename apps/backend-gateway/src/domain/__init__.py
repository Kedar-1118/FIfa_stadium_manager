"""
StadiumOS AI — Domain Layer Package.

The domain layer contains enterprise business rules that are independent of
any framework, database, or external service. Classes in this layer define
the core entities, value objects, enumerations, and domain-specific exceptions
that model the real-world stadium operations domain.

Clean Architecture Principle:
    This layer has ZERO imports from application, infrastructure, or interfaces.
    It is the innermost ring of the dependency graph.
"""
