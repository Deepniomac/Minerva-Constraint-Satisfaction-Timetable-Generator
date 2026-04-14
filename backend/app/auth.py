from passlib.context import CryptContext
from jose import jwt

SECRET_KEY = "minerva-secret"
ALGORITHM = "HS256"

# Use pbkdf2_sha256 for stable cross-platform hashing behavior.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str):
    return pwd_context.verify(plain, hashed)


def create_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
