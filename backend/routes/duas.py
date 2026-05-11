from fastapi import APIRouter, HTTPException, Query
from services.dua_service import dua_service

router = APIRouter()


@router.get("/duas/categories")
async def get_dua_categories():
    return dua_service.get_categories()


@router.get("/duas/category/{id}")
async def get_dua_category(id: str):
    cat = dua_service.get_category(id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.get("/duas/topic/{id}")
async def get_dua_topic(id: str):
    topic = dua_service.get_topic(id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.get("/duas/search")
async def search_duas(q: str = Query("", min_length=1)):
    return dua_service.search(q)


@router.get("/duas/bookmarks")
async def get_dua_bookmarks():
    return []


@router.get("/duas/{id}")
async def get_dua_detail(id: str):
    dua = dua_service.get_dua(id)
    if not dua:
        raise HTTPException(status_code=404, detail="Dua not found")
    return dua
