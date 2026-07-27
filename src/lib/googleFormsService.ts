import { GoogleFormConfig, PendingTravellerRegistration, TravellerRole } from "../types";

export interface CreateFormResponse {
  formConfig: GoogleFormConfig;
  success: boolean;
  message?: string;
}

/**
 * Creates a Google Form with all 12 traveller registration fields + agreement checkbox
 * and a linked Google Sheet.
 */
export async function createGoogleForm(
  tripName: string,
  accessToken: string
): Promise<CreateFormResponse> {
  try {
    // 1. Create Google Form
    const createFormRes = await fetch("https://forms.googleapis.com/v1/forms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        info: {
          title: `TripPro Traveller Registration - ${tripName}`,
          documentTitle: `TripPro Traveller Registration - ${tripName}`,
        },
      }),
    });

    if (!createFormRes.ok) {
      const err = await createFormRes.json();
      throw new Error(err.error?.message || "Failed to create Google Form");
    }

    const formData = await createFormRes.json();
    const formId = formData.formId;
    const responderUri = formData.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`;

    // 2. Add Questions via batchUpdate
    const batchRequests = [
      // 1. Full Name (Short Answer) – Required
      {
        createItem: {
          item: {
            title: "Full Name",
            questionItem: {
              question: {
                required: true,
                textQuestion: {},
              },
            },
          },
          location: { index: 0 },
        },
      },
      // 2. Age (Number) – Required
      {
        createItem: {
          item: {
            title: "Age",
            description: "Please enter your age as a positive number",
            questionItem: {
              question: {
                required: true,
                textQuestion: {},
              },
            },
          },
          location: { index: 1 },
        },
      },
      // 3. Gender (Dropdown)
      {
        createItem: {
          item: {
            title: "Gender",
            questionItem: {
              question: {
                required: false,
                choiceQuestion: {
                  type: "DROP_DOWN",
                  options: [
                    { value: "Male" },
                    { value: "Female" },
                    { value: "Other" },
                  ],
                },
              },
            },
          },
          location: { index: 2 },
        },
      },
      // 4. Role (Dropdown)
      {
        createItem: {
          item: {
            title: "Role",
            questionItem: {
              question: {
                required: false,
                choiceQuestion: {
                  type: "DROP_DOWN",
                  options: [
                    { value: "Traveller" },
                    { value: "Organizer" },
                    { value: "Guide" },
                  ],
                },
              },
            },
          },
          location: { index: 3 },
        },
      },
      // 5. Personal Budget (₹) (Number) – Required
      {
        createItem: {
          item: {
            title: "Personal Budget (₹)",
            description: "Specify your allocated budget in ₹",
            questionItem: {
              question: {
                required: true,
                textQuestion: {},
              },
            },
          },
          location: { index: 4 },
        },
      },
      // 6. Phone (Short Answer)
      {
        createItem: {
          item: {
            title: "Phone",
            description: "Including country code (e.g. +91 98765 43210)",
            questionItem: {
              question: {
                required: false,
                textQuestion: {},
              },
            },
          },
          location: { index: 5 },
        },
      },
      // 7. Emergency Contact (Short Answer)
      {
        createItem: {
          item: {
            title: "Emergency Contact",
            description: "Name & Phone number of emergency contact",
            questionItem: {
              question: {
                required: false,
                textQuestion: {},
              },
            },
          },
          location: { index: 6 },
        },
      },
      // 8. Blood Group (Dropdown)
      {
        createItem: {
          item: {
            title: "Blood Group",
            questionItem: {
              question: {
                required: false,
                choiceQuestion: {
                  type: "DROP_DOWN",
                  options: [
                    { value: "A+" },
                    { value: "A-" },
                    { value: "B+" },
                    { value: "B-" },
                    { value: "AB+" },
                    { value: "AB-" },
                    { value: "O+" },
                    { value: "O-" },
                  ],
                },
              },
            },
          },
          location: { index: 7 },
        },
      },
      // 9. Email (Email)
      {
        createItem: {
          item: {
            title: "Email",
            questionItem: {
              question: {
                required: false,
                textQuestion: {},
              },
            },
          },
          location: { index: 8 },
        },
      },
      // 10. Passport Number (Optional)
      {
        createItem: {
          item: {
            title: "Passport Number",
            description: "Optional",
            questionItem: {
              question: {
                required: false,
                textQuestion: {},
              },
            },
          },
          location: { index: 9 },
        },
      },
      // 11. Driving License Number (Optional)
      {
        createItem: {
          item: {
            title: "Driving License Number",
            description: "Optional",
            questionItem: {
              question: {
                required: false,
                textQuestion: {},
              },
            },
          },
          location: { index: 10 },
        },
      },
      // 12. Profile Photo (File Upload / Short Answer Link)
      {
        createItem: {
          item: {
            title: "Profile Photo",
            description: "URL or link to your profile photo",
            questionItem: {
              question: {
                required: false,
                textQuestion: {},
              },
            },
          },
          location: { index: 11 },
        },
      },
      // 13. Agreement Checkbox – Required
      {
        createItem: {
          item: {
            title: "Accuracy Confirmation",
            questionItem: {
              question: {
                required: true,
                choiceQuestion: {
                  type: "CHECKBOX",
                  options: [
                    { value: "I confirm that the information provided is accurate." },
                  ],
                },
              },
            },
          },
          location: { index: 12 },
        },
      },
    ];

    const batchRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests: batchRequests }),
    });

    if (!batchRes.ok) {
      console.warn("Forms batchUpdate partial error, proceeding with base form");
    }

    // 3. Create linked Google Sheet
    let spreadsheetId: string | undefined;
    try {
      const sheetRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            title: `TripPro Registrations - ${tripName}`,
          },
          sheets: [
            {
              properties: {
                title: "Responses",
              },
              data: [
                {
                  startRow: 0,
                  startColumn: 0,
                  rowData: [
                    {
                      values: [
                        { userEnteredValue: { stringValue: "Timestamp" } },
                        { userEnteredValue: { stringValue: "Full Name" } },
                        { userEnteredValue: { stringValue: "Age" } },
                        { userEnteredValue: { stringValue: "Gender" } },
                        { userEnteredValue: { stringValue: "Role" } },
                        { userEnteredValue: { stringValue: "Personal Budget (₹)" } },
                        { userEnteredValue: { stringValue: "Phone" } },
                        { userEnteredValue: { stringValue: "Emergency Contact" } },
                        { userEnteredValue: { stringValue: "Blood Group" } },
                        { userEnteredValue: { stringValue: "Email" } },
                        { userEnteredValue: { stringValue: "Passport Number" } },
                        { userEnteredValue: { stringValue: "Driving License Number" } },
                        { userEnteredValue: { stringValue: "Profile Photo" } },
                        { userEnteredValue: { stringValue: "Accuracy Confirmed" } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      });
      if (sheetRes.ok) {
        const sheetData = await sheetRes.json();
        spreadsheetId = sheetData.spreadsheetId;
      }
    } catch (e) {
      console.warn("Could not create spreadsheet directly, continuing without spreadsheet ID", e);
    }

    const formConfig: GoogleFormConfig = {
      formId,
      responderUri,
      spreadsheetId,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      formConfig,
    };
  } catch (error: any) {
    console.error("Error creating Google Form:", error);
    return {
      success: false,
      message: error.message || "Failed to create Google Form via Google API",
      formConfig: {
        formId: `form_${Date.now()}`,
        responderUri: `https://docs.google.com/forms/d/e/sample_${Date.now()}/viewform`,
        createdAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * Fetches form responses directly from Google Forms API / Sheets API
 */
export async function fetchGoogleFormResponses(
  formId: string,
  accessToken: string
): Promise<PendingTravellerRegistration[]> {
  try {
    // Get form structure to map question IDs to field names
    const formRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!formRes.ok) {
      throw new Error("Could not fetch Google Form metadata");
    }

    const formDetails = await formRes.json();
    const items = formDetails.items || [];
    
    // Map questionId -> title
    const questionMap: Record<string, string> = {};
    items.forEach((item: any) => {
      if (item.questionItem?.question?.questionId) {
        questionMap[item.questionItem.question.questionId] = item.title;
      }
    });

    // Get Form responses
    const responsesRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!responsesRes.ok) {
      throw new Error("Could not fetch form responses");
    }

    const responsesData = await responsesRes.json();
    const rawResponses = responsesData.responses || [];

    const parsedRegistrations: PendingTravellerRegistration[] = rawResponses.map((resp: any) => {
      const answers = resp.answers || {};
      let fullName = "";
      let age = 25;
      let gender: "Male" | "Female" | "Other" = "Male";
      let role: TravellerRole = "Traveller";
      let budget = 5000;
      let phone = "";
      let emergencyContact = "";
      let bloodGroup = "O+";
      let email = "";
      let passportNumber = "";
      let drivingLicense = "";
      let profilePhoto = "";
      let accuracyConfirmed = true;

      Object.keys(answers).forEach((qId) => {
        const qTitle = (questionMap[qId] || "").toLowerCase();
        const textValues = answers[qId].textAnswers?.answers?.map((a: any) => a.value) || [];
        const val = textValues.join(", ");

        if (qTitle.includes("full name") || qTitle.includes("name")) fullName = val;
        else if (qTitle.includes("age")) age = parseInt(val) || 25;
        else if (qTitle.includes("gender")) gender = (val as any) || "Male";
        else if (qTitle.includes("role")) role = (val as any) || "Traveller";
        else if (qTitle.includes("budget")) budget = parseFloat(val.replace(/[^0-9.]/g, "")) || 5000;
        else if (qTitle.includes("phone")) phone = val;
        else if (qTitle.includes("emergency")) emergencyContact = val;
        else if (qTitle.includes("blood")) bloodGroup = val;
        else if (qTitle.includes("email")) email = val;
        else if (qTitle.includes("passport")) passportNumber = val;
        else if (qTitle.includes("license")) drivingLicense = val;
        else if (qTitle.includes("photo")) profilePhoto = val;
        else if (qTitle.includes("accuracy") || qTitle.includes("confirm")) accuracyConfirmed = true;
      });

      return {
        id: resp.responseId || `resp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        submissionDate: resp.createTime
          ? new Date(resp.createTime).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : new Date().toLocaleDateString("en-IN"),
        fullName: fullName || "Anonymous Traveller",
        age,
        gender,
        role,
        allocatedBudget: budget,
        phone,
        emergencyContact,
        bloodGroup,
        email,
        passportNumber,
        drivingLicense,
        profilePhoto: profilePhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop",
        accuracyConfirmed,
        status: "Pending",
      };
    });

    return parsedRegistrations;
  } catch (error) {
    console.warn("Google Forms response fetch warning:", error);
    return [];
  }
}
