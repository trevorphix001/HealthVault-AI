// ============================================================
// HEALTHVAULT AI
// api.js
// Frontend API layer
// Supabase = Database
// n8n = AI/OCR/Automation
// ============================================================


// ============================================================
// 1. SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL = "https://hgchtelulgakrlpvetex.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_5PF8_7_uKK7wh6aLU269yw_YpModnBm";


// Create Supabase client
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// ============================================================
// 2. n8n CONFIGURATION
// ============================================================

const N8N_BASE_URL =
    "https://nghoshh57.app.n8n.cloud/webhook";


// ============================================================
// 3. GENERIC n8n FETCH HELPER
// ============================================================

async function apiFetch(path, options = {}) {

    const response = await fetch(
        `${N8N_BASE_URL}${path}`,
        {
            ...options,
            headers: {
                ...(options.body instanceof FormData
                    ? {}
                    : {
                        "Content-Type": "application/json"
                    }),
                ...(options.headers || {})
            }
        }
    );

    let data;

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed with status ${response.status}`
        );
    }

    return data;
}


// ============================================================
// 4. API OBJECT
// ============================================================

const Api = {

    // ========================================================
    // REGISTER USER
    // ========================================================

    async registerUser(payload) {

        const { data, error } = await supabaseClient
            .from("users")
            .insert([payload])
            .select()
            .single();

        if (error) {

            console.error(
                "Supabase registration error:",
                error
            );

            throw error;
        }

        return {
            success: true,
            user_id: data.user_id
        };
    },


    // ========================================================
    // GET DASHBOARD
    // ========================================================

    async getDashboard(userId) {

        // Get user
        const { data: user, error: userError } =
            await supabaseClient
                .from("users")
                .select("*")
                .eq("user_id", userId)
                .maybeSingle();

        if (userError) {
            throw userError;
        }

        if (!user) {
            return {
                notFound: true
            };
        }


        // Get medical reports
        const { data: reports, error: reportsError } =
            await supabaseClient
                .from("medical_reports")
                .select("*")
                .eq("user_id", userId)
                .order("report_date", {
                    ascending: false
                });

        if (reportsError) {
            throw reportsError;
        }


        // Get health parameters
        const { data: parameters, error: parametersError } =
            await supabaseClient
                .from("health_parameters")
                .select("*")
                .eq("user_id", userId)
                .order("measured_date", {
                    ascending: false
                });

        if (parametersError) {
            throw parametersError;
        }


        // Get medications
        const { data: medications, error: medicationsError } =
            await supabaseClient
                .from("medications")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", {
                    ascending: false
                });

        if (medicationsError) {
            throw medicationsError;
        }


        // Get appointments
        const { data: appointments, error: appointmentsError } =
            await supabaseClient
                .from("appointments")
                .select("*")
                .eq("user_id", userId)
                .order("appointment_date", {
                    ascending: true
                });

        if (appointmentsError) {
            throw appointmentsError;
        }


        return {
            notFound: false,
            user: user,
            reports: reports || [],
            parameters: parameters || [],
            medications: medications || [],
            appointments: appointments || []
        };
    },


    // ========================================================
    // HEALTH TRENDS
    // ========================================================

    async getTrends(userId) {

        const { data, error } =
            await supabaseClient
                .from("health_parameters")
                .select(
                    "name,value,measured_date"
                )
                .eq("user_id", userId)
                .order("measured_date", {
                    ascending: true
                });

        if (error) {
            throw error;
        }


        const grouped = {};


        for (const row of data || []) {

            if (
                row.value === null ||
                row.value === undefined
            ) {
                continue;
            }


            if (!grouped[row.name]) {
                grouped[row.name] = [];
            }


            grouped[row.name].push({
                date: row.measured_date,
                value: row.value
            });
        }


        return grouped;
    },


    // ========================================================
    // GET MEDICATIONS
    // ========================================================

    async getMedications(userId) {

        const { data, error } =
            await supabaseClient
                .from("medications")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", {
                    ascending: false
                });

        if (error) {
            throw error;
        }

        return data || [];
    },


    // ========================================================
    // ADD MEDICATION
    // ========================================================

    async addMedication(payload) {

        const { data, error } =
            await supabaseClient
                .from("medications")
                .insert([
                    {
                        ...payload,
                        is_active: true
                    }
                ])
                .select()
                .single();

        if (error) {
            throw error;
        }

        return data;
    },


    // ========================================================
    // GET APPOINTMENTS
    // ========================================================

    async getAppointments(userId) {

        const { data, error } =
            await supabaseClient
                .from("appointments")
                .select("*")
                .eq("user_id", userId)
                .order("appointment_date", {
                    ascending: true
                });

        if (error) {
            throw error;
        }

        return data || [];
    },


    // ========================================================
    // ADD APPOINTMENT
    // ========================================================

    async addAppointment(payload) {

        const { data, error } =
            await supabaseClient
                .from("appointments")
                .insert([
                    {
                        ...payload,
                        status: "upcoming"
                    }
                ])
                .select()
                .single();

        if (error) {
            throw error;
        }

        return data;
    },


    // ========================================================
    // UPLOAD MEDICAL REPORT
    // ========================================================
    //
    // IMPORTANT:
    // Report upload still goes through n8n.
    //
    // Frontend
    //      ↓
    // n8n /upload-report
    //      ↓
    // OCR
    //      ↓
    // Gemini
    //      ↓
    // Supabase
    //
    // ========================================================

    async uploadReport(formData) {

        return await apiFetch(
            "/upload-report",
            {
                method: "POST",
                body: formData
            }
        );
    },


    // ========================================================
    // GET DOCTOR REPORT
    // ========================================================

    async getDoctorReport(reportId) {

        const { data: report, error: reportError } =
            await supabaseClient
                .from("medical_reports")
                .select("*")
                .eq("report_id", reportId)
                .maybeSingle();

        if (reportError) {
            throw reportError;
        }

        if (!report) {
            return {
                notFound: true
            };
        }


        // Get patient
        const { data: patient, error: patientError } =
            await supabaseClient
                .from("users")
                .select("*")
                .eq("user_id", report.user_id)
                .maybeSingle();

        if (patientError) {
            throw patientError;
        }


        // Get parameters
        const { data: parameters, error: parametersError } =
            await supabaseClient
                .from("health_parameters")
                .select("*")
                .eq("report_id", reportId)
                .order("name", {
                    ascending: true
                });

        if (parametersError) {
            throw parametersError;
        }


        // Get doctor reviews
        const { data: reviews, error: reviewsError } =
            await supabaseClient
                .from("doctor_reviews")
                .select("*")
                .eq("report_id", reportId)
                .order("created_at", {
                    ascending: false
                });

        if (reviewsError) {
            throw reviewsError;
        }


        return {
            notFound: false,
            patient: patient,
            report: report,
            parameters: parameters || [],
            reviews: reviews || []
        };
    },


    // ========================================================
    // SUBMIT DOCTOR REVIEW
    // ========================================================

    async submitDoctorReview(payload) {

        const { data, error } =
            await supabaseClient
                .from("doctor_reviews")
                .insert([
                    {
                        report_id: payload.report_id,
                        doctor_name: payload.doctor_name,
                        review: payload.review
                    }
                ])
                .select()
                .single();

        if (error) {
            throw error;
        }

        return {
            success: true,
            review: data
        };
    }

};