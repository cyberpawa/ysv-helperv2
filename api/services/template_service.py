"""Configuration profiles for supported paper timesheet templates and PII ROI cropping."""

TIMESHEET_TEMPLATES: dict[str, dict] = {
    "form_p5_standard": {
        "id": "form_p5_standard",
        "name": "Типова форма № П-5 (Стандартна)",
        "description": (
            "Стандартний табель обліку робочого часу "
            "(4 рядки працівників, стандартна шапка підрозділу)"
        ),
        "roi_crop": {"left": 0.15, "top": 0.15, "width": 0.85, "height": 0.70},
        "employee_rows": 4,
        "excel_template": "timesheet_template.xlsx",
    },
    "form_p5_extended": {
        "id": "form_p5_extended",
        "name": "Форма № П-5 (Розширена шапка та ПІБ)",
        "description": (
            "Бланк із розширеним блоком реквізитів філії та широкою графою "
            "табельних номерів і ПІБ"
        ),
        "roi_crop": {"left": 0.22, "top": 0.20, "width": 0.78, "height": 0.68},
        "employee_rows": 4,
        "excel_template": "timesheet_template.xlsx",
    },
    "form_uz_shift": {
        "id": "form_uz_shift",
        "name": "Цехова відомість змінного графіка",
        "description": "Скорочений змінний бланк без розширеної шапки підприємства",
        "roi_crop": {"left": 0.12, "top": 0.10, "width": 0.88, "height": 0.80},
        "employee_rows": 4,
        "excel_template": "timesheet_template.xlsx",
    },
}

DEFAULT_TEMPLATE_ID = "form_p5_standard"


def get_template_profile(template_id: str | None) -> dict:
    """Resolve template profile by ID, falling back to form_p5_standard."""
    if not template_id or template_id == "auto" or template_id not in TIMESHEET_TEMPLATES:
        return TIMESHEET_TEMPLATES[DEFAULT_TEMPLATE_ID]
    return TIMESHEET_TEMPLATES[template_id]


def list_template_profiles() -> list[dict]:
    """Return all configured template profiles for API consumers."""
    return list(TIMESHEET_TEMPLATES.values())
