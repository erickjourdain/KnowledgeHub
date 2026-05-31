import enum


class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    GESTIONNAIRE = "GESTIONNAIRE"
    USER = "USER"