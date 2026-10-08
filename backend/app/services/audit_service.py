import json
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from backend.app.models import AuditLog, User

def log_audit_action(
    db: Session,
    admin: Optional[User],
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = "127.0.0.1"
) -> AuditLog:
    """
    Records an administrative change into the persistent AuditLog.
    """
    def serialize(val):
        if val is None:
            return None
        if isinstance(val, str):
            return val
        try:
            return json.dumps(val, default=str)
        except Exception:
            return str(val)

    log_entry = AuditLog(
        admin_id=admin.id if admin else None,
        admin_email=admin.email if admin else "system",
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        old_values=serialize(old_values),
        new_values=serialize(new_values),
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
