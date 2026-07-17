"""
StadiumOS AI — Domain Entities Package.

Domain entities are the core business objects of the StadiumOS platform.
Each entity has a unique identity (UUID) and encapsulates the business
rules that govern its behavior and state transitions.

Entities in this package:
    - User: An authenticated system user with an RBAC role.
    - Stadium: A physical venue hosting FIFA World Cup 2026 matches.
    - Sector: A logical subdivision of a stadium (e.g., North Stand, VIP).
    - Gate: A physical entry/exit point within a sector.
    - Volunteer: A field staff member assigned to stadium operations.
    - Incident: A reported event requiring operational response.
"""
