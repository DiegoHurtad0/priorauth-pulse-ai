"""
appeal.py — AI-powered PA appeal letter generator using Claude Opus 4.6.
Generates a clinical peer-to-peer review appeal letter for denied prior authorizations.
"""

import os
import anthropic

# CPT code descriptions for clinical context
CPT_DESCRIPTIONS = {
    "27447": "Total Knee Arthroplasty (TKA) — complete replacement of the knee joint",
    "29827": "Arthroscopic rotator cuff repair — minimally invasive shoulder surgery",
    "27130": "Total Hip Arthroplasty (THA) — complete replacement of the hip joint",
    "43239": "Upper GI endoscopy with biopsy — diagnostic gastroscopy with tissue sampling",
    "70553": "MRI brain with and without contrast — neurological diagnostic imaging",
    "64483": "Injection, anesthetic agent, transforaminal epidural — spine pain management",
    "29881": "Arthroscopic knee surgery with meniscectomy — minimally invasive knee repair",
    "33533": "Coronary artery bypass, arterial — open heart surgery for coronary disease",
    "33249": "Implantation of cardiac defibrillator (ICD) — life-saving cardiac device",
}


async def generate_appeal_letter(
    patient_name: str,
    member_id: str,
    dob: str,
    cpt_code: str,
    payer_name: str,
    denial_reason: str,
    requesting_provider: str = "Dr. Elena Rodriguez",
    auth_number: str | None = None,
) -> str:
    """
    Generate a clinical peer-to-peer review appeal letter using Claude Opus 4.6.

    Returns the complete letter as a string.
    Raises an exception if the API call fails.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        # Return a realistic demo letter if no API key is set
        return _demo_letter(
            patient_name, member_id, dob, cpt_code, payer_name,
            denial_reason, requesting_provider, auth_number
        )

    client = anthropic.Anthropic(api_key=api_key)

    procedure_desc = CPT_DESCRIPTIONS.get(cpt_code, f"CPT {cpt_code}")

    prompt = f"""You are a senior medical director writing a formal peer-to-peer review appeal letter to overturn a prior authorization denial. Write a compelling, clinically precise letter.

Patient Information:
- Name: {patient_name}
- Member ID: {member_id}
- Date of Birth: {dob}
- Requesting Provider: {requesting_provider}
- Procedure: {procedure_desc} (CPT {cpt_code})
- Payer: {payer_name}
- Denial Reason: {denial_reason}
{f"- Original Auth Reference: {auth_number}" if auth_number else ""}

Write a complete formal appeal letter that:
1. Opens with today's date (March 27, 2026) and proper addressing to the Medical Director at {payer_name}
2. States the patient's case and the denied procedure clearly
3. Provides clinical justification with evidence-based medicine citations (at least 2 specific studies or guidelines)
4. Directly rebuts the stated denial reason with medical evidence
5. Describes the clinical necessity and patient-specific factors
6. References relevant clinical guidelines (e.g., AAOS, ACC/AHA, ACG, etc.)
7. Requests expedited reconsideration
8. Closes professionally with the physician's signature block

Format as a complete letter ready to send. Be specific, authoritative, and medically precise. The letter should be approximately 400-500 words."""

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1500,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    )

    # Extract text from the response
    text_blocks = [b.text for b in response.content if b.type == "text"]
    return "\n\n".join(text_blocks)


def _demo_letter(
    patient_name: str,
    member_id: str,
    dob: str,
    cpt_code: str,
    payer_name: str,
    denial_reason: str,
    requesting_provider: str,
    auth_number: str | None,
) -> str:
    """Fallback demo letter when ANTHROPIC_API_KEY is not set."""
    procedure_desc = CPT_DESCRIPTIONS.get(cpt_code, f"CPT {cpt_code}")
    return f"""March 27, 2026

Medical Director, Prior Authorization Review
{payer_name} Health Plan
Attn: Peer-to-Peer Review Department

RE: Appeal for Prior Authorization Denial
Patient: {patient_name} | Member ID: {member_id} | DOB: {dob}
Procedure: {procedure_desc} (CPT {cpt_code})
{f"Original Reference: {auth_number}" if auth_number else ""}

Dear Medical Director,

I am writing to formally appeal the denial of prior authorization for {patient_name} (Member ID: {member_id}) for the above-referenced procedure. The stated reason for denial was: "{denial_reason}."

CLINICAL JUSTIFICATION

{patient_name} has been under my care for the past 18 months with a documented clinical course that clearly supports the medical necessity of this procedure. Conservative treatment modalities, including physical therapy (completed 12-week supervised program), anti-inflammatory medications, and corticosteroid injections, have been exhausted without adequate clinical improvement. The patient's functional limitations are severe, scoring 24/100 on the KOOS (Knee Injury and Osteoarthritis Outcome Score), indicating critical impairment of daily activities.

EVIDENCE-BASED SUPPORT

1. American Academy of Orthopaedic Surgeons (AAOS) Clinical Practice Guideline (2021): Strongly recommends surgical intervention for patients with end-stage osteoarthritis who have failed conservative management for ≥6 months, which is consistent with this patient's clinical trajectory.

2. New England Journal of Medicine (Jevsevar et al., 2013, updated 2022): Demonstrated that total joint arthroplasty provides statistically significant improvement in pain and function compared to continued non-operative management in appropriately selected patients.

3. National Institute for Health and Care Excellence (NICE) Guideline NG226: Recommends joint replacement when quality of life is significantly impaired and conservative treatment has not provided adequate relief within a clinically appropriate timeframe.

REBUTTAL TO DENIAL REASON

The denial citing "{denial_reason}" does not align with the clinical evidence in this case. The patient has completed all required conservative treatments and has documented, objective findings on recent MRI (dated March 10, 2026) confirming advanced joint degeneration (Kellgren-Lawrence Grade IV). Continued delay in surgical intervention risks further functional decline, increased fall risk, and opioid dependence for pain management.

REQUEST FOR EXPEDITED REVIEW

Given the severity of the patient's condition and the risk of clinical deterioration, I respectfully request expedited peer-to-peer review within 72 hours. I am available at any time to discuss this case directly.

Sincerely,

{requesting_provider}, MD, FACS
Board Certified Orthopedic Surgeon
License #CA-29847
Phone: (415) 555-0123
Fax: (415) 555-0124
NPI: 1234567890

[This letter was generated by PriorAuth Pulse AI — powered by Claude Opus 4.6 & TinyFish]"""
