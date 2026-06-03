import os,io,json,re
from typing import List,Dict,Optional
from dotenv import load_dotenv
from fastapi import FastAPI,UploadFile,File,Form,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pdfplumber
from bs4 import BeautifulSoup
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app=FastAPI(title="AI Resume Screener API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "https://ai-resume-screener-ashen.vercel.app"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model=genai.GenerativeModel("gemini-2.5-flash")

class SectionScore(BaseModel):
    score:int
    tip:str

class AnalyzeResponse(BaseModel):
    overall_score:int
    reasoning:str
    matched_skills:List[str]
    missing_skills:List[str]
    strengths:List[str]
    improvements:List[str]
    section_scores:Dict[str,SectionScore]
    ats_score:int
    present_keywords:List[str]
    missing_keywords:List[str]
    recruiter_summary:str

def clean_text(x:str)->str:
    x=BeautifulSoup(x or "","html.parser").get_text(" ")
    x=re.sub(r"\s+"," ",x)
    return x.strip()

async def extract_pdf_text(file:UploadFile)->str:
    if file.content_type!="application/pdf":
        raise HTTPException(status_code=400,detail="Only PDF files are supported")
    data=await file.read()
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            text="\n".join([(p.extract_text() or "") for p in pdf.pages])
        if not text.strip():
            raise HTTPException(status_code=400,detail="Could not extract text from PDF")
        return text.strip()
    except Exception:
        raise HTTPException(status_code=400,detail="Failed to read PDF")

def ask_gemini(prompt:str)->dict:
    try:
        res=model.generate_content(prompt)
        raw=res.text.strip().replace("```json","").replace("```","").strip()
        return json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500,detail=f"AI failed: {str(e)}")

@app.get("/")
def home():
    return {"message":"AI Resume Screener API running"}

@app.post("/api/analyze",response_model=AnalyzeResponse)
async def analyze(resume:UploadFile=File(...),job_description:str=Form(...)):
    resume_text=await extract_pdf_text(resume)
    jd=clean_text(job_description)

    prompt=f"""
Act as a senior technical recruiter and ATS evaluator.

Return ONLY valid JSON with this exact schema:
{{
 "overall_score": 0,
 "reasoning": "2 sentence explanation",
 "matched_skills": [],
 "missing_skills": [],
 "strengths": [],
 "improvements": [],
 "section_scores": {{
   "experience": {{"score": 0, "tip": ""}},
   "skills": {{"score": 0, "tip": ""}},
   "education": {{"score": 0, "tip": ""}},
   "projects": {{"score": 0, "tip": ""}}
 }},
 "ats_score": 0,
 "present_keywords": [],
 "missing_keywords": [],
 "recruiter_summary": "short recruiter-style summary"
}}

Rules:
- Scores must be 0 to 100.
- Give 3 to 5 strengths.
- Give 3 to 5 improvements.
- Mention exact JD keywords.
- No markdown.
- JSON only.

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd}
"""
    data=ask_gemini(prompt)
    return AnalyzeResponse(**data)

@app.post("/api/compare")
async def compare(resume:UploadFile=File(...),jd1:str=Form(...),jd2:str=Form(...),jd3:Optional[str]=Form(None)):
    resume_text=await extract_pdf_text(resume)
    jds=[clean_text(jd1),clean_text(jd2)]
    if jd3 and jd3.strip():
        jds.append(clean_text(jd3))

    prompt=f"""
Compare this resume against multiple JDs.

Return ONLY valid JSON:
{{
 "results":[
   {{
    "role_name":"",
    "score":0,
    "rank":1,
    "reasoning":"",
    "key_gaps":[]
   }}
 ]
}}

Rules:
- Rank 1 is best fit.
- Infer role name from JD.
- JSON only.

RESUME:
{resume_text}

JDS:
{json.dumps(jds)}
"""
    return ask_gemini(prompt)

@app.post("/api/rewrite-bullet")
async def rewrite_bullet(bullet:str=Form(...),job_description:str=Form(...)):
    prompt=f"""
Rewrite this resume bullet for the JD.

Return ONLY valid JSON:
{{
 "original":"",
 "rewritten":"",
 "improvements":[]
}}

Rules:
- Strong action verb.
- Add metric if reasonable.
- Keep truthful.
- JSON only.

BULLET:
{bullet}

JD:
{clean_text(job_description)}
"""
    return ask_gemini(prompt)
@app.post("/api/interview-questions")
async def interview_questions(
    resume:UploadFile=File(...),
    job_description:str=Form(...)
):
    resume_text=await extract_pdf_text(resume)

    prompt=f"""
Generate likely interview questions based on this resume and JD.

Return ONLY valid JSON:
{{
 "questions":[
   {{
    "category":"",
    "question":"",
    "why_asked":"",
    "sample_answer_hint":""
   }}
 ]
}}

Rules:
- Generate 12 questions.
- Include technical, project-based, HR, and JD-specific questions.
- Keep answers as short hints, not full long answers.
- JSON only.

RESUME:
{resume_text}

JD:
{clean_text(job_description)}
"""

    return ask_gemini(prompt)
@app.post("/api/cover-letter")
async def cover_letter(resume:UploadFile=File(...),job_description:str=Form(...),tone:str=Form("formal")):
    resume_text=await extract_pdf_text(resume)
    prompt=f"""
Write a tailored 250-350 word cover letter.

Return ONLY valid JSON:
{{"cover_letter":""}}

Tone: {tone}

RESUME:
{resume_text}

JD:
{clean_text(job_description)}
"""
    return ask_gemini(prompt)