import { useState } from "react";
import api from "../services/api";
import jsPDF from "jspdf";

export default function Dashboard(){
  const [file,setFile]=useState(null);
  const [jd,setJd]=useState("");
  const [jd2,setJd2]=useState("");
  const [jd3,setJd3]=useState("");
  const [tone,setTone]=useState("formal");
  const [result,setResult]=useState(null);
  const [compareResult,setCompareResult]=useState(null);
  const [coverLetter,setCoverLetter]=useState("");
  const [bullet,setBullet]=useState("");
  const [rewrittenBullet,setRewrittenBullet]=useState("");
  const [questions,setQuestions]=useState([]);
  const [loading,setLoading]=useState(false);
  const [compareLoading,setCompareLoading]=useState(false);
  const [coverLoading,setCoverLoading]=useState(false);
  const [rewriteLoading,setRewriteLoading]=useState(false);
  const [questionLoading,setQuestionLoading]=useState(false);
  const [activeTab,setActiveTab]=useState("analyze");

  const analyzeResume=async()=>{
    if(!file||!jd){
      alert("Upload resume and paste JD first");
      return;
    }

    const formData=new FormData();
    formData.append("resume",file);
    formData.append("job_description",jd);

    setLoading(true);
    setResult(null);

    try{
      const res=await api.post("/api/analyze",formData);
      setResult(res.data);
    }catch(err){
      console.log(err);
      alert("Analysis failed. Check backend terminal.");
    }

    setLoading(false);
  };

  const compareJDs=async()=>{
    if(!file||!jd||!jd2){
      alert("Upload resume and paste at least 2 JDs");
      return;
    }

    const formData=new FormData();
    formData.append("resume",file);
    formData.append("jd1",jd);
    formData.append("jd2",jd2);

    if(jd3.trim()){
      formData.append("jd3",jd3);
    }

    setCompareLoading(true);
    setCompareResult(null);

    try{
      const res=await api.post("/api/compare",formData);
      setCompareResult(res.data.results);
    }catch(err){
      console.log(err);
      alert("Comparison failed. Check backend terminal.");
    }

    setCompareLoading(false);
  };

  const generateCoverLetter=async()=>{
    if(!file||!jd){
      alert("Upload resume and paste JD first");
      return;
    }

    const formData=new FormData();
    formData.append("resume",file);
    formData.append("job_description",jd);
    formData.append("tone",tone);

    setCoverLoading(true);
    setCoverLetter("");

    try{
      const res=await api.post("/api/cover-letter",formData);
      setCoverLetter(res.data.cover_letter);
    }catch(err){
      console.log(err);
      alert("Cover letter generation failed.");
    }

    setCoverLoading(false);
  };

  const rewriteBullet=async()=>{
    if(!bullet){
      alert("Enter a resume bullet first");
      return;
    }

    if(!jd){
      alert("Paste job description first");
      return;
    }

    setRewriteLoading(true);
    setRewrittenBullet("");

    try{
      const formData=new FormData();
      formData.append("bullet",bullet);
      formData.append("job_description",jd);

      const res=await api.post("/api/rewrite-bullet",formData);
      setRewrittenBullet(res.data.rewritten);
    }catch(err){
      console.log(err);
      alert("Rewrite failed. Check backend terminal.");
    }

    setRewriteLoading(false);
  };

  const generateQuestions=async()=>{
    if(!file||!jd){
      alert("Upload resume and paste JD first");
      return;
    }

    const formData=new FormData();
    formData.append("resume",file);
    formData.append("job_description",jd);

    setQuestionLoading(true);
    setQuestions([]);

    try{
      const res=await api.post("/api/interview-questions",formData);
      setQuestions(res.data.questions);
    }catch(err){
      console.log(err);
      alert("Interview questions failed. Check backend terminal.");
    }

    setQuestionLoading(false);
  };

  const downloadQuestions=()=>{
    const text=questions.map((q,index)=>`
${index+1}. ${q.question}

Category: ${q.category}

Why Asked:
${q.why_asked}

Answer Hint:
${q.sample_answer_hint}

----------------------------------------
`).join("\n");

    const blob=new Blob([text],{type:"text/plain"});
    const url=window.URL.createObjectURL(blob);
    const a=document.createElement("a");

    a.href=url;
    a.download="interview-questions.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const copyCoverLetter=()=>{
    navigator.clipboard.writeText(coverLetter);
    alert("Cover letter copied!");
  };

  const downloadReport=()=>{
    if(!result){
      alert("Analyze resume first");
      return;
    }

    const doc=new jsPDF();
    let y=20;

    doc.setFontSize(22);
    doc.text("ResumeAI Analysis Report",20,y);

    y+=15;
    doc.setFontSize(14);
    doc.text(`Overall Score: ${result.overall_score}/100`,20,y);

    y+=10;
    doc.text(`ATS Score: ${result.ats_score}/100`,20,y);

    y+=15;
    doc.setFontSize(16);
    doc.text("Recruiter Summary",20,y);

    y+=10;
    doc.setFontSize(11);
    const summary=doc.splitTextToSize(result.recruiter_summary,170);
    doc.text(summary,20,y);
    y+=summary.length*7+8;

    doc.setFontSize(16);
    doc.text("Matched Skills",20,y);

    y+=10;
    doc.setFontSize(11);
    doc.text(result.matched_skills.join(", "),20,y);
    y+=15;

    doc.setFontSize(16);
    doc.text("Missing Skills",20,y);

    y+=10;
    doc.setFontSize(11);
    doc.text(result.missing_skills.join(", "),20,y);
    y+=15;

    doc.setFontSize(16);
    doc.text("Improvements",20,y);

    y+=10;
    doc.setFontSize(11);

    result.improvements.forEach((item,index)=>{
      const lines=doc.splitTextToSize(`${index+1}. ${item}`,170);

      if(y>270){
        doc.addPage();
        y=20;
      }

      doc.text(lines,20,y);
      y+=lines.length*7+4;
    });

    doc.save("resumeai-analysis-report.pdf");
  };

  const score=result?.overall_score||78;
  const ats=result?.ats_score||72;

  return(
    <div className="page">
      <nav className="nav">
        <div className="logo">
          <span>✦</span>Resume<em>AI</em>
        </div>

        <div className="navlinks">
          <button onClick={()=>setActiveTab("analyze")}>Analyze</button>
          <button onClick={()=>setActiveTab("compare")}>Compare</button>
          <button onClick={()=>setActiveTab("cover")}>Cover Letter</button>
          <button onClick={()=>setActiveTab("interview")}>Interview Prep</button>
          <button onClick={()=>setActiveTab("tools")}>Tools</button>
        </div>

        <button className="pill">Gemini Powered →</button>
      </nav>

      {activeTab==="analyze"&&(
        <>
          <section className="hero" id="analyze">
            <div className="left">
              <div className="eyebrow">
                <span></span>AI-Powered · Resume Screener
              </div>

              <h1>
                Get the
                <em> interview,</em>
                <span>not ignored.</span>
              </h1>

              <p className="desc">
                Upload your resume, paste a JD, and let AI analyze your match score,
                missing skills, ATS keywords, and recruiter-style improvements.
              </p>

              <div className="uploadBox">
                <label className="fileBox">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e)=>setFile(e.target.files[0])}
                  />

                  <div>
                    <strong>{file?file.name:"Upload Resume PDF"}</strong>
                    <p>Drag or click to upload. PDF only.</p>
                  </div>
                </label>

                <textarea
                  value={jd}
                  onChange={(e)=>setJd(e.target.value)}
                  placeholder="Paste job description here..."
                />

                <button className="analyzeBtn" onClick={analyzeResume}>
                  {loading?"Analyzing...":"Analyze My Resume →"}
                </button>
              </div>
            </div>

            <div className="right">
              <div className="analysisCard">
                <div className="cardTop">
                  <span className="live">● Live Analysis</span>
                  <h3>{result?"Resume Match Report":"Frontend Developer Role"}</h3>
                  <p>Gemini · FastAPI · React · PDF Parser</p>
                </div>

                <div className="scoreArea">
                  <div
                    className="ring"
                    style={{
                      background:`conic-gradient(var(--blush) ${score*3.6}deg,var(--custard) 0deg)`
                    }}
                  >
                    <div>
                      <strong>{score}</strong>
                      <span>/100</span>
                    </div>
                  </div>

                  <div>
                    <h4>{score>70?"Strong Match":score>40?"Moderate Match":"Weak Match"}</h4>
                    <p>
                      {result?.reasoning||
                        "Upload a resume and JD to generate a full AI recruiter evaluation."}
                    </p>
                  </div>
                </div>

                <div className="previewSkills">
                  <h4>Matched Skills</h4>
                  <div className="chips">
                    {(result?.matched_skills||["React","JavaScript","REST APIs","Git"]).map((x)=>(
                      <span className="chip good" key={x}>{x}</span>
                    ))}
                  </div>

                  <h4>Missing Skills</h4>
                  <div className="chips">
                    {(result?.missing_skills||["Docker","Testing"]).map((x)=>(
                      <span className="chip bad" key={x}>{x}</span>
                    ))}
                  </div>
                </div>

                <div className="miniGrid">
                  <div>
                    <strong>{ats}%</strong>
                    <span>ATS Score</span>
                  </div>

                  <div>
                    <strong>{result?.matched_skills?.length||4}</strong>
                    <span>Matched</span>
                  </div>

                  <div>
                    <strong>{result?.missing_skills?.length||2}</strong>
                    <span>Gaps</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="marquee">
            <div>
              <span>PDF Upload ✦ </span>
              <span>ATS Score ✦ </span>
              <span>Skill Gap Analysis ✦ </span>
              <span>Multi-JD Comparison ✦ </span>
              <span>Cover Letter Generator ✦ </span>
              <span>Recruiter Summary ✦ </span>
              <span>PDF Upload ✦ </span>
              <span>ATS Score ✦ </span>
              <span>Skill Gap Analysis ✦ </span>
              <span>Multi-JD Comparison ✦ </span>
            </div>
          </div>

          {result&&(
            <section className="results">
              <div className="resultCard wide">
                <h2>Download Report</h2>
                <p className="summary">
                  Export your resume score, ATS score, skills, gaps, and improvements as a PDF report.
                </p>

                <button className="coverBtn" onClick={downloadReport}>
                  Download Analysis Report
                </button>
              </div>

              <div className="resultCard">
                <h2>Matched Skills</h2>
                <div className="chips">
                  {result.matched_skills.map((x)=>(
                    <span className="chip good" key={x}>{x}</span>
                  ))}
                </div>
              </div>

              <div className="resultCard">
                <h2>Missing Skills</h2>
                <div className="chips">
                  {result.missing_skills.map((x)=>(
                    <span className="chip bad" key={x}>{x}</span>
                  ))}
                </div>
              </div>

              <div className="resultCard wide">
                <h2>Section Scores</h2>

                <div className="sections">
                  {Object.entries(result.section_scores).map(([name,data])=>(
                    <div className="sectionRow" key={name}>
                      <div>
                        <strong>{name}</strong>
                        <p>{data.tip}</p>
                      </div>

                      <span>{data.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="resultCard wide">
                <h2>Recruiter Summary</h2>
                <p className="summary">{result.recruiter_summary}</p>
              </div>
            </section>
          )}

          <section className="features" id="features">
            <div className="secLabel">What it does</div>
            <h2>Every tool you need to <em>get shortlisted.</em></h2>

            <div className="featureGrid">
              <div className="featureCard">
                <b>01</b>
                <h3>PDF Resume Upload</h3>
                <p>Upload your resume and extract clean text for AI analysis.</p>
              </div>

              <div className="featureCard gold">
                <b>02</b>
                <h3>AI Match Score</h3>
                <p>Get a role-specific score with clear reasoning.</p>
              </div>

              <div className="featureCard blush">
                <b>03</b>
                <h3>Skill Gap Analysis</h3>
                <p>See matched and missing skills as visual chips.</p>
              </div>

              <div className="featureCard">
                <b>04</b>
                <h3>ATS Keywords</h3>
                <p>Find keywords present and missing from your resume.</p>
              </div>

              <div className="featureCard dark">
                <b>05</b>
                <h3>Multi-JD Comparison</h3>
                <p>Compare one resume against multiple job descriptions.</p>
              </div>

              <div className="featureCard blush">
                <b>06</b>
                <h3>Cover Letter Generator</h3>
                <p>Generate a tailored cover letter in your chosen tone.</p>
              </div>
            </div>
          </section>
        </>
      )}
{activeTab==="cover"&&(
  <section className="coverBox" id="cover">
    <div className="toolLayout">
      <div className="toolPanel">
        <h2 className="toolTitle">AI Cover Letter Generator</h2>

        <p className="toolDesc">
          Generate a tailored 250–350 word cover letter using your resume and selected job description.
        </p>

        <div className="toneRow">
          <button
            className={tone==="formal"?"tone active":"tone"}
            onClick={()=>setTone("formal")}
          >
            Formal
          </button>

          <button
            className={tone==="conversational"?"tone active":"tone"}
            onClick={()=>setTone("conversational")}
          >
            Conversational
          </button>

          <button
            className={tone==="startup-casual"?"tone active":"tone"}
            onClick={()=>setTone("startup-casual")}
          >
            Startup Casual
          </button>
        </div>

        <button className="coverBtn" onClick={generateCoverLetter}>
          {coverLoading?"Writing...":"Generate Cover Letter →"}
        </button>
      </div>

      <div className="toolPreview">
        {coverLetter?(
          <div className="letterCard">
            <button className="copyBtn" onClick={copyCoverLetter}>
              Copy
            </button>

            <p>{coverLetter}</p>
          </div>
        ):(
          <div className="emptyState">
            Your generated cover letter will appear here.
          </div>
        )}
      </div>
    </div>
  </section>
)}

      {activeTab==="compare"&&(
  <section className="compareBox" id="compare">
    <h2>Multi-JD Comparison</h2>

    <p>
      Compare your resume against multiple roles and discover which opportunity
      is your strongest match.
    </p>

    <div className="compareGrid">
      <textarea
        value={jd}
        onChange={(e)=>setJd(e.target.value)}
        placeholder="Job Description 1"
      />

      <textarea
        value={jd2}
        onChange={(e)=>setJd2(e.target.value)}
        placeholder="Job Description 2"
      />

      <textarea
        value={jd3}
        onChange={(e)=>setJd3(e.target.value)}
        placeholder="Job Description 3 optional"
      />
    </div>

    <button className="analyzeBtn" onClick={compareJDs}>
      {compareLoading?"Comparing...":"Compare Roles →"}
    </button>

    {compareResult&&(
      <div className="compareResults">
        {compareResult.map((x)=>(
          <div className="rankCard" key={x.rank}>
            <div className="rank">#{x.rank}</div>

            <div>
              <h3>{x.role_name}</h3>
              <p>{x.reasoning}</p>
              <strong>{x.score}/100 Match</strong>

              <div className="chips">
                {x.key_gaps.map((g)=>(
                  <span className="chip bad" key={g}>{g}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
)}
{activeTab==="interview"&&(
  <section className="interviewBox" id="interview">
    <div className="toolLayout">
      <div className="toolPanel">
        <h2 className="toolTitle">AI Interview Questions Generator</h2>

        <p className="toolDesc">
          Generate likely technical, project-based, HR, and JD-specific interview questions from your resume and job description.
        </p>

        <button className="coverBtn" onClick={generateQuestions}>
          {questionLoading?"Generating...":"Generate Interview Questions →"}
        </button>

        {questions.length>0&&(
          <button
            className="coverBtn"
            onClick={downloadQuestions}
            style={{marginTop:"14px"}}
          >
            Download Questions
          </button>
        )}
      </div>

      <div className="toolPreview">
        {questions.length>0?(
          <div className="questionGrid">
            {questions.map((q,index)=>(
              <div className="questionCard" key={index}>
                <span>{q.category}</span>
                <h3>{q.question}</h3>

                <p>
                  <strong>Why asked:</strong> {q.why_asked}
                </p>

                <p>
                  <strong>Answer hint:</strong> {q.sample_answer_hint}
                </p>
              </div>
            ))}
          </div>
        ):(
          <div className="emptyState">
            Your generated interview questions will appear here.
          </div>
        )}
      </div>
    </div>
  </section>
)}

{activeTab==="tools"&&(
  <section className="rewriteBox" id="rewrite">
    <div className="toolLayout">
      <div className="toolPanel">
        <h2 className="toolTitle">AI Resume Rewriter</h2>

        <p className="toolDesc">
          Turn weak resume bullets into recruiter-ready impact statements.
        </p>

        <textarea
          value={bullet}
          onChange={(e)=>setBullet(e.target.value)}
          placeholder="Example: Developed responsive UI for seamless cross-device experience."
        />

        <button className="coverBtn" onClick={rewriteBullet}>
          {rewriteLoading?"Improving...":"Improve Resume Bullet →"}
        </button>
      </div>

      <div className="toolPreview">
        {rewrittenBullet?(
          <div className="letterCard">
            <h3>Improved Version</h3>
            <p>{rewrittenBullet}</p>
          </div>
        ):(
          <div className="emptyState">
            Your improved resume bullet will appear here.
          </div>
        )}
      </div>
    </div>
  </section>
)}

      <footer>
        <div>Resume<em>AI</em></div>
        <p>Built with Gemini · FastAPI · React · Vercel · Railway</p>
      </footer>
    </div>
  );
}