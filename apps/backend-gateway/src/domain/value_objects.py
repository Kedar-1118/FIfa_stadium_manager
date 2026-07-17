"""
StadiumOS AI — Domain Value Objects.

Value objects are immutable data structures that represent descriptive aspects
of the domain with no conceptual identity. Two Coordinates instances with
the same latitude/longitude are considered equal regardless of when or where
they were created.

Design Decisions:
    - Value objects use Pydantic's BaseModel with frozen=True to enforce
      immutability. Once created, their fields cannot be modified — any
      "change" requires creating a new instance.
    - Unlike entities (which have UUIDs), value objects define equality via
      structural comparison (all field values must match).
    - These are pure domain concepts with ZERO dependencies on SQLAlchemy
      or any infrastructure layer. ORM models will embed these values
      as individual columns or composite types.
"""

from pydantic import BaseModel, Field, field_validator


class Coordinates(BaseModel, frozen=True):
    """
    Geographic coordinates representing a point on Earth's surface.

    Used throughout the domain to represent gate positions, volunteer
    locations, and incident sites. The Digital Twin's Redis spatial
    index stores these values via GEOADD for proximity queries.

    Attributes:
        latitude: WGS84 latitude in decimal degrees (-90.0 to 90.0).
        longitude: WGS84 longitude in decimal degrees (-180.0 to 180.0).
    """

    latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="WGS84 latitude in decimal degrees.",
        examples=[43.6821],
    )
    longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="WGS84 longitude in decimal degrees.",
        examples=[-79.6122],
    )

    def to_redis_args(self) -> tuple[float, float]:
        """
        Return coordinates in Redis GEOADD argument order (longitude, latitude).

        Redis spatial commands expect (longitude, latitude) — the OPPOSITE
        of the conventional (latitude, longitude) order. This method
        encapsulates that conversion to prevent off-by-axis bugs.

        Returns:
            A tuple of (longitude, latitude) for use with Redis GEOADD.
        """
        return (self.longitude, self.latitude)


class SectorBoundary(BaseModel, frozen=True):
    """
    Polygon boundary defining a stadium sector's geographic footprint.

    The boundary is represented as a list of Coordinates forming a closed
    polygon. This is used by the Crowd Dynamics Agent to determine which
    sector a given point (e.g., an incident location) falls within.

    Attributes:
        vertices: Ordered list of coordinates forming the polygon boundary.
            The first and last vertex must be identical to close the polygon.
    """

    vertices: list[Coordinates] = Field(
        ...,
        min_length=4,  # Minimum: 3 unique points + 1 closing point
        description=(
            "Ordered polygon vertices. Must have at least 4 points "
            "(3 unique + closing point matching the first)."
        ),
    )

    @field_validator("vertices")
    @classmethod
    def validate_closed_polygon(cls, vertices: list[Coordinates]) -> list[Coordinates]:
        """Ensure the polygon is closed (first vertex == last vertex)."""
        if vertices[0] != vertices[-1]:
            raise ValueError(
                "Polygon must be closed: the first and last vertices must be identical."
            )
        return vertices


class CapacityInfo(BaseModel, frozen=True):
    """
    Capacity metadata for a stadium sector or gate.

    Used by the Crowd Dynamics Agent to compute occupancy percentages
    and trigger congestion alerts when current occupancy approaches
    the maximum safe capacity.

    Attributes:
        max_capacity: Maximum number of people the area can safely hold.
        warning_threshold_percent: Occupancy percentage that triggers
            a warning alert (default: 80%).
        critical_threshold_percent: Occupancy percentage that triggers
            a critical alert and potential evacuation (default: 95%).
    """

    max_capacity: int = Field(
        ...,
        gt=0,
        description="Maximum number of people the area can safely hold.",
    )
    warning_threshold_percent: float = Field(
        default=80.0,
        ge=50.0,
        le=100.0,
        description="Occupancy percentage triggering a warning alert.",
    )
    critical_threshold_percent: float = Field(
        default=95.0,
        ge=70.0,
        le=100.0,
        description="Occupancy percentage triggering a critical alert.",
    )

    @field_validator("critical_threshold_percent")
    @classmethod
    def critical_must_exceed_warning(
        cls, critical: float, info: object  # noqa: ANN001 — Pydantic ValidationInfo
    ) -> float:
        """Ensure critical threshold is always higher than warning threshold."""
        # Access the already-validated warning_threshold_percent value
        warning = info.data.get("warning_threshold_percent", 80.0)  # type: ignore[union-attr]
        if critical <= warning:
            raise ValueError(
                f"critical_threshold_percent ({critical}) must be greater than "
                f"warning_threshold_percent ({warning})."
            )
        return critical

    def is_warning(self, current_occupancy: int) -> bool:
        """Check if current occupancy exceeds the warning threshold."""
        return (current_occupancy / self.max_capacity * 100) >= self.warning_threshold_percent

    def is_critical(self, current_occupancy: int) -> bool:
        """Check if current occupancy exceeds the critical threshold."""
        return (current_occupancy / self.max_capacity * 100) >= self.critical_threshold_percent
