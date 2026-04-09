from typing import TypedDict
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from dotenv import load_dotenv
import re
import os

load_dotenv()

# 1. Define the State
class PitchState(TypedDict):
    raw_pitch: str
    pacing_feedback: str
    narrative_feedback: str
    final_score: int

# Initialize the Groq Model
llm = ChatGroq(temperature=0.2, model_name="llama3-8b-8192")

# 2. Define the Agent Nodes
def pacing_agent(state: PitchState):
    prompt = PromptTemplate.from_template(
        "You are an expert public speaking coach. Analyze the following pitch text (which may be transcribed from audio). "
        "Comment strictly on the estimated pacing, tone, and use of filler words. "
        "Keep your feedback constructive, actionable, and under 3 sentences.\n\n"
        "Pitch: {pitch}"
    )
    chain = prompt | llm | StrOutputParser()
    feedback = chain.invoke({"pitch": state["raw_pitch"]})
    return {"pacing_feedback": feedback}

def narrative_agent(state: PitchState):
    prompt = PromptTemplate.from_template(
        "You are an expert pitch consultant. Analyze the narrative structure, hook, and clarity of the following pitch. "
        "Provide concise, actionable feedback on how to improve the story arc. Keep it under 3 sentences.\n\n"
        "Pitch: {pitch}"
    )
    chain = prompt | llm | StrOutputParser()
    feedback = chain.invoke({"pitch": state["raw_pitch"]})
    return {"narrative_feedback": feedback}

def scoring_agent(state: PitchState):
    prompt = PromptTemplate.from_template(
        "Based on the original pitch, the pacing feedback, and the narrative feedback, assign a final overall presentation score out of 100. "
        "You MUST output ONLY the integer number. Do not include any other text.\n\n"
        "Pitch: {pitch}\n"
        "Pacing Feedback: {pacing}\n"
        "Narrative Feedback: {narrative}"
    )
    chain = prompt | llm | StrOutputParser()
    result = chain.invoke({
        "pitch": state["raw_pitch"],
        "pacing": state.get("pacing_feedback", ""),
        "narrative": state.get("narrative_feedback", "")
    })
    
    # Safely extract just the integer from the LLM's response
    match = re.search(r'\d+', result)
    score = int(match.group()) if match else 75 # Fallback to 75 if parsing fails
    
    return {"final_score": score}

# 3. Build the Graph
workflow = StateGraph(PitchState)

workflow.add_node("pacing", pacing_agent)
workflow.add_node("narrative", narrative_agent)
workflow.add_node("scoring", scoring_agent)

# Sequential execution for context passing
workflow.set_entry_point("pacing")
workflow.add_edge("pacing", "narrative")
workflow.add_edge("narrative", "scoring")
workflow.add_edge("scoring", END)

lingua_graph = workflow.compile()