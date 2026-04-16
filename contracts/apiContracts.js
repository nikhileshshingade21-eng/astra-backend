const { z } = require('zod');

// Attendance Specific Contracts
const markAttendanceSchema = z.object({
  body: z.object({
    class_id: z.number().int().positive("Invalid class_id"),
    device_id: z.string().min(1, "device_id is required"),
    raw_qr_data: z.string().optional().nullable(),
    gps_lat: z.number().optional().nullable(),
    gps_lng: z.number().optional().nullable(),
    wifi_ssid: z.string().optional().nullable(),
    wifi_bssid: z.string().optional().nullable(),
  })
});

const manualMarkSchema = z.object({
  body: z.object({
    class_id: z.number().int().positive("Invalid class_id"),
    student_id: z.number().int().positive("Invalid student_id"),
    date: z.string().optional() // YYYY-MM-DD
  })
});

// Admin & Announcement Schemas
const announcementSchema = z.object({
  body: z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    content: z.string().min(10, "Content must be at least 10 characters"),
    category: z.string().optional().default('General'),
    section: z.string().optional().default('All'),
    image_url: z.string().url("Invalid image URL").optional().nullable()
  })
});

const addZoneSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Zone name must be at least 3 characters"),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radius_m: z.number().positive().optional().default(100)
  })
});

const reportRequestSchema = z.object({
  body: z.object({
    type: z.enum(['attendance', 'security', 'summary']).default('attendance'),
    format: z.enum(['pdf', 'csv', 'email']).default('email'),
    filters: z.object({
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      section: z.string().optional()
    }).optional()
  })
});

module.exports = {
  markAttendanceSchema,
  manualMarkSchema,
  announcementSchema,
  addZoneSchema,
  reportRequestSchema
};
