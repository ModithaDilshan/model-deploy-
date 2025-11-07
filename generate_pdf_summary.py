# generate_pdf_summary.py
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from datetime import datetime

def create_pdf_summary():
    # Create PDF document
    filename = f"Unity_Game_Builder_Project_Summary_{datetime.now().strftime('%Y%m%d')}.pdf"
    doc = SimpleDocTemplate(filename, pagesize=letter,
                           rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=18)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a237e'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading1_style = ParagraphStyle(
        'CustomHeading1',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#283593'),
        spaceAfter=12,
        spaceBefore=12,
        fontName='Helvetica-Bold'
    )
    
    heading2_style = ParagraphStyle(
        'CustomHeading2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#3949ab'),
        spaceAfter=8,
        spaceBefore=8,
        fontName='Helvetica-Bold'
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=6,
        alignment=TA_JUSTIFY,
        leading=14
    )
    
    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=4,
        leftIndent=20,
        bulletIndent=10
    )
    
    # Title
    elements.append(Paragraph("Unity Game Builder Project", title_style))
    elements.append(Paragraph("Custom 3D Model Upload System", title_style))
    elements.append(Spacer(1, 0.2*inch))
    elements.append(Paragraph(f"<i>Generated on: {datetime.now().strftime('%B %d, %Y')}</i>", 
                             styles['Normal']))
    elements.append(PageBreak())
    
    # 1. Project Overview
    elements.append(Paragraph("1. Project Overview", heading1_style))
    
    elements.append(Paragraph("<b>What We Want to Achieve</b>", heading2_style))
    elements.append(Paragraph(
        "Build a web-based system that allows users to upload custom 3D character models via a website, "
        "automatically replace placeholder models in a Unity project on the server, trigger automated builds "
        "to generate game executables, and download the customized game to play on their machines.",
        normal_style))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("<b>Business Value</b>", heading2_style))
    bullet_points = [
        "Customization: Users can personalize games with their own 3D models",
        "Automation: No manual Unity work required for each custom build",
        "Scalability: Multiple users can create custom builds simultaneously",
        "User Experience: Simple web interface accessible to non-technical users"
    ]
    for point in bullet_points:
        elements.append(Paragraph(f"• {point}", bullet_style))
    
    elements.append(PageBreak())
    
    # 2. System Architecture
    elements.append(Paragraph("2. System Architecture", heading1_style))
    elements.append(Paragraph(
        "The system consists of three main components: a web frontend for user interaction, "
        "a backend API server for processing, and the Unity project with build automation.",
        normal_style))
    
    architecture_text = """
    <b>User's Browser</b> → Web Interface (HTML/CSS/JavaScript)
    <br/>↓ HTTP Requests
    <br/><b>Backend API Server</b> (Node.js) → File Upload, Build Trigger, Status Tracking
    <br/>↓ File Operations & Command Execution
    <br/><b>Unity Project</b> → Model Replacement → Unity Editor CLI → Build Output (.exe)
    """
    elements.append(Paragraph(architecture_text, normal_style))
    
    elements.append(PageBreak())
    
    # 3. What Needs to Be Done
    elements.append(Paragraph("3. What Needs to Be Done", heading1_style))
    
    elements.append(Paragraph("<b>My Responsibilities (Backend/Web Developer)</b>", heading2_style))
    
    responsibilities = {
        "A. Backend API Development": [
            "Create Node.js/Express server",
            "Implement file upload handling (multer)",
            "Implement model replacement logic",
            "Implement Unity build trigger (command-line execution)",
            "Implement build status tracking system",
            "Implement file download serving",
            "Error handling and logging"
        ],
        "B. Web Frontend Development": [
            "Create upload interface (drag & drop + file picker)",
            "Create build trigger UI",
            "Create download interface",
            "Implement status/progress display",
            "Implement polling for build status",
            "User feedback and error messages"
        ],
        "C. File Management": [
            "Organize uploaded model storage",
            "Manage Unity project file paths",
            "Handle build output storage",
            "Implement file cleanup (optional)"
        ],
        "D. Integration & Testing": [
            "Coordinate with Unity developer for configuration",
            "Test end-to-end workflow",
            "Handle edge cases and errors",
            "Performance optimization"
        ]
    }
    
    for section, items in responsibilities.items():
        elements.append(Paragraph(f"<b>{section}</b>", heading2_style))
        for item in items:
            elements.append(Paragraph(f"• {item}", bullet_style))
        elements.append(Spacer(1, 0.05*inch))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("<b>Unity Developer's Responsibilities</b>", heading2_style))
    unity_tasks = [
        "Create Unity build script (BuildScript.cs)",
        "Configure Unity project structure",
        "Set up model import settings",
        "Configure build settings",
        "Provide configuration details (paths, method names, etc.)",
        "Test Unity build process independently"
    ]
    for task in unity_tasks:
        elements.append(Paragraph(f"• {task}", bullet_style))
    
    elements.append(PageBreak())
    
    # 4. How to Implement
    elements.append(Paragraph("4. How to Implement", heading1_style))
    
    phases = {
        "Phase 1: Setup & Configuration (1-2 days)": [
            "Get information from Unity developer (paths, configurations)",
            "Initialize Node.js project and install dependencies",
            "Create project structure (server, frontend, config files)"
        ],
        "Phase 2: Backend Development (3-4 days)": [
            "Create server with file upload endpoint",
            "Implement model replacement logic",
            "Implement build trigger with Unity CLI",
            "Implement status tracking system",
            "Implement download service"
        ],
        "Phase 3: Frontend Development (2-3 days)": [
            "Create upload interface with drag & drop",
            "Create build trigger UI",
            "Create download interface",
            "Implement status polling for real-time updates"
        ],
        "Phase 4: Integration & Testing (2-3 days)": [
            "Integration testing with Unity developer",
            "Error handling and edge cases",
            "Security and optimization",
            "Final testing and bug fixes"
        ]
    }
    
    for phase, steps in phases.items():
        elements.append(Paragraph(f"<b>{phase}</b>", heading2_style))
        for step in steps:
            elements.append(Paragraph(f"• {step}", bullet_style))
        elements.append(Spacer(1, 0.05*inch))
    
    elements.append(PageBreak())
    
    # 5. Technology Stack
    elements.append(Paragraph("5. Technology Stack", heading1_style))
    
    tech_stack = {
        "Backend": [
            "Node.js - Runtime environment",
            "Express.js - Web framework",
            "Multer - File upload handling",
            "fs-extra - Enhanced file system operations",
            "child_process - Execute Unity build commands"
        ],
        "Frontend": [
            "HTML5 - Structure",
            "CSS3 - Styling",
            "JavaScript (Vanilla) - Interactivity",
            "Fetch API - HTTP requests"
        ],
        "Infrastructure": [
            "File System - Store uploaded models and builds",
            "Unity Editor CLI - Automated builds",
            "Web Server - Serve API and frontend"
        ]
    }
    
    for category, items in tech_stack.items():
        elements.append(Paragraph(f"<b>{category}</b>", heading2_style))
        for item in items:
            elements.append(Paragraph(f"• {item}", bullet_style))
        elements.append(Spacer(1, 0.05*inch))
    
    elements.append(PageBreak())
    
    # 6. Key Features
    elements.append(Paragraph("6. Key Features", heading1_style))
    
    elements.append(Paragraph("<b>User Features</b>", heading2_style))
    user_features = [
        "Drag & drop 3D model upload",
        "Real-time upload progress",
        "One-click build trigger",
        "Build status monitoring",
        "Direct executable download",
        "Clear error messages"
    ]
    for feature in user_features:
        elements.append(Paragraph(f"• {feature}", bullet_style))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("<b>System Features</b>", heading2_style))
    system_features = [
        "Automatic model replacement",
        "Automated Unity builds",
        "Build status tracking",
        "File validation",
        "Error handling",
        "Logging"
    ]
    for feature in system_features:
        elements.append(Paragraph(f"• {feature}", bullet_style))
    
    elements.append(PageBreak())
    
    # 7. Workflow Example
    elements.append(Paragraph("7. Workflow Example", heading1_style))
    
    workflow_steps = [
        "User opens website",
        "User uploads 3D model (.fbx file) → Backend validates and stores",
        "Backend replaces model in Unity project → Copies to Assets/Models/Character.fbx",
        "User clicks 'Build Game' → Backend triggers Unity build command",
        "Frontend polls build status → Shows 'Building...' status every 2 seconds",
        "Build completes → Backend detects .exe file → Updates status to 'completed'",
        "User downloads game → Backend streams .exe file → User saves and plays"
    ]
    
    for i, step in enumerate(workflow_steps, 1):
        elements.append(Paragraph(f"{i}. {step}", bullet_style))
    
    elements.append(PageBreak())
    
    # 8. Dependencies & Coordination
    elements.append(Paragraph("8. Dependencies & Coordination", heading1_style))
    
    elements.append(Paragraph("<b>Required from Unity Developer</b>", heading2_style))
    unity_reqs = [
        "Unity project access (read/write permissions)",
        "Unity Editor installation path",
        "Build script implementation",
        "Configuration details (paths, method names)",
        "Testing support"
    ]
    for req in unity_reqs:
        elements.append(Paragraph(f"• {req}", bullet_style))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("<b>Required Infrastructure</b>", heading2_style))
    infra_reqs = [
        "Server with Node.js installed",
        "File system access to Unity project",
        "Unity Editor installed on server",
        "Sufficient disk space for builds",
        "Network access for web interface"
    ]
    for req in infra_reqs:
        elements.append(Paragraph(f"• {req}", bullet_style))
    
    elements.append(PageBreak())
    
    # 9. Timeline Estimate
    elements.append(Paragraph("9. Timeline Estimate", heading1_style))
    
    # Create timeline table
    timeline_data = [
        ['Phase', 'Task', 'Duration', 'Dependencies'],
        ['1', 'Setup & Configuration', '1-2 days', 'Unity dev provides config'],
        ['2', 'Backend Development', '3-4 days', 'Phase 1 complete'],
        ['3', 'Frontend Development', '2-3 days', 'Backend API ready'],
        ['4', 'Integration & Testing', '2-3 days', 'All components ready'],
        ['Total', '', '8-12 days', '']
    ]
    
    timeline_table = Table(timeline_data, colWidths=[0.5*inch, 2.5*inch, 1.2*inch, 2.3*inch])
    timeline_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3949ab')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
    ]))
    elements.append(timeline_table)
    
    elements.append(PageBreak())
    
    # 10. Risks & Considerations
    elements.append(Paragraph("10. Risks & Considerations", heading1_style))
    
    elements.append(Paragraph("<b>Technical Risks</b>", heading2_style))
    tech_risks = [
        "Unity build failures - Need proper error handling",
        "File system permissions - Ensure proper access rights",
        "Large file uploads - Implement size limits and validation",
        "Build time variability - Implement proper status polling",
        "Concurrent builds - May need queue system for multiple users"
    ]
    for risk in tech_risks:
        elements.append(Paragraph(f"• {risk}", bullet_style))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("<b>Security Considerations</b>", heading2_style))
    security = [
        "File upload validation - Prevent malicious files",
        "Path traversal protection - Validate file paths",
        "Rate limiting - Prevent abuse",
        "Authentication (future) - Control who can build",
        "File cleanup - Manage disk space"
    ]
    for item in security:
        elements.append(Paragraph(f"• {item}", bullet_style))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("<b>Scalability Considerations</b>", heading2_style))
    scalability = [
        "Multiple concurrent builds - May need job queue (Bull/Redis)",
        "Storage management - Cleanup old builds",
        "Database for build tracking (optional - currently in-memory)",
        "Load balancing (if multiple servers)"
    ]
    for item in scalability:
        elements.append(Paragraph(f"• {item}", bullet_style))
    
    elements.append(PageBreak())
    
    # 11. Future Enhancements
    elements.append(Paragraph("11. Future Enhancements (Optional)", heading1_style))
    
    enhancements = [
        "User authentication system",
        "Build history and management",
        "Multiple model uploads (characters, props, etc.)",
        "Build customization options (game settings, levels)",
        "Email notifications when build completes",
        "Build queue system for multiple users",
        "Analytics and usage tracking",
        "Docker containerization for easier deployment"
    ]
    for enhancement in enhancements:
        elements.append(Paragraph(f"• {enhancement}", bullet_style))
    
    elements.append(PageBreak())
    
    # 12. Success Criteria
    elements.append(Paragraph("12. Success Criteria", heading1_style))
    
    elements.append(Paragraph("<b>Functional Requirements</b>", heading2_style))
    func_reqs = [
        "Users can upload 3D models successfully",
        "Models are correctly replaced in Unity project",
        "Build process completes successfully",
        "Users can download working executables",
        "System handles errors gracefully"
    ]
    for req in func_reqs:
        elements.append(Paragraph(f"✓ {req}", bullet_style))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("<b>Non-Functional Requirements</b>", heading2_style))
    non_func_reqs = [
        "Upload completes in reasonable time (< 1 min for typical files)",
        "Build status updates in real-time",
        "System is stable and doesn't crash",
        "Error messages are user-friendly",
        "Code is maintainable and documented"
    ]
    for req in non_func_reqs:
        elements.append(Paragraph(f"✓ {req}", bullet_style))
    
    elements.append(PageBreak())
    
    # 13. Deliverables
    elements.append(Paragraph("13. Deliverables", heading1_style))
    
    deliverables = {
        "Backend API Server": [
            "Complete Node.js/Express server",
            "All API endpoints implemented",
            "Error handling and logging"
        ],
        "Web Frontend": [
            "Complete HTML/CSS/JavaScript interface",
            "Responsive design",
            "User-friendly UI/UX"
        ],
        "Documentation": [
            "API documentation",
            "Setup instructions",
            "Configuration guide",
            "Deployment guide"
        ],
        "Testing": [
            "Integration tests",
            "End-to-end workflow verification",
            "Error scenario testing"
        ]
    }
    
    for deliverable, items in deliverables.items():
        elements.append(Paragraph(f"<b>{deliverable}</b>", heading2_style))
        for item in items:
            elements.append(Paragraph(f"• {item}", bullet_style))
        elements.append(Spacer(1, 0.05*inch))
    
    elements.append(PageBreak())
    
    # 14. Next Steps
    elements.append(Paragraph("14. Next Steps", heading1_style))
    
    elements.append(Paragraph("<b>Immediate Actions:</b>", heading2_style))
    immediate = [
        "Get configuration details from Unity developer",
        "Set up development environment",
        "Create project structure"
    ]
    for action in immediate:
        elements.append(Paragraph(f"• {action}", bullet_style))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("<b>Week 1:</b>", heading2_style))
    week1 = [
        "Complete backend API development",
        "Basic frontend implementation",
        "Initial testing"
    ]
    for action in week1:
        elements.append(Paragraph(f"• {action}", bullet_style))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("<b>Week 2:</b>", heading2_style))
    week2 = [
        "Complete frontend development",
        "Integration with Unity developer",
        "End-to-end testing",
        "Bug fixes and refinements"
    ]
    for action in week2:
        elements.append(Paragraph(f"• {action}", bullet_style))
    
    elements.append(PageBreak())
    
    # Final Summary
    elements.append(Paragraph("Summary", heading1_style))
    elements.append(Paragraph(
        "This project creates a web-based system for customizing Unity games with user-uploaded 3D models. "
        "The backend handles file uploads, model replacement, and automated builds. The frontend provides "
        "a simple interface for users. Implementation takes approximately 8-12 days, with coordination needed "
        "from the Unity developer for configuration and testing.",
        normal_style))
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph(
        "The system automates the entire customization and build process, making it accessible to "
        "non-technical users while maintaining the flexibility of Unity game development.",
        normal_style))
    
    # Build PDF
    doc.build(elements)
    print(f"PDF generated successfully: {filename}")
    return filename

if __name__ == "__main__":
    try:
        create_pdf_summary()
    except ImportError:
        print("Error: reportlab library not found.")
        print("Please install it using: pip install reportlab")
    except Exception as e:
        print(f"Error generating PDF: {e}")
        import traceback
        traceback.print_exc()


