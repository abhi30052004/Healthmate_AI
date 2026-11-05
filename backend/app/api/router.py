from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.care import router as care_router
from app.api.routes.data_quality import router as data_quality_router
from app.api.routes.doctor_sharing import doctor_router, router as doctor_sharing_router
from app.api.routes.documents import router as documents_router
from app.api.routes.family_profile import router as family_profile_router
from app.api.routes.medical_chat import router as medical_chat_router
from app.api.routes.medical_insights import router as medical_insights_router
from app.api.routes.medical_search import router as medical_search_router
from app.api.routes.quick_reference import router as quick_reference_router
from app.api.routes.reminder import router as reminder_router
from app.api.routes.report_comparison import router as report_comparison_router
from app.api.routes.timeline import router as timeline_router
from app.api.routes.visit_pack import router as visit_pack_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(family_profile_router)
api_router.include_router(care_router)
api_router.include_router(documents_router)
api_router.include_router(timeline_router)
api_router.include_router(medical_chat_router)
api_router.include_router(quick_reference_router)
api_router.include_router(medical_insights_router)
api_router.include_router(report_comparison_router)
api_router.include_router(medical_search_router)
api_router.include_router(visit_pack_router)
api_router.include_router(reminder_router)
api_router.include_router(doctor_sharing_router)
api_router.include_router(doctor_router)
api_router.include_router(data_quality_router)


