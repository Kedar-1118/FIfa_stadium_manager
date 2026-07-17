"""
StadiumOS AI — Application Layer Package.

The application layer contains use-case orchestrators (services) and the
abstract port interfaces (repositories) that define how the domain interacts
with external infrastructure. Pydantic DTOs (schemas) for API input/output
validation also reside here.

Clean Architecture Principle:
    This layer depends ONLY on the domain layer. It defines abstract
    interfaces (ports) that the infrastructure layer implements (adapters).
    This inversion of control allows swapping database implementations
    without modifying any business logic.
"""
