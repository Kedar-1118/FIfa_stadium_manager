"""
StadiumOS AI — Interfaces Layer Package.

The interfaces layer is the outermost ring of Clean Architecture. It contains
the framework-specific delivery mechanisms: FastAPI routers, middleware,
WebSocket handlers, and the dependency injection container.

Clean Architecture Principle:
    This layer depends on the application layer (to invoke use cases) and
    the infrastructure layer (to wire concrete implementations into the
    dependency injection container). It NEVER contains business logic —
    routers validate input, call a service, and format the response.
"""
