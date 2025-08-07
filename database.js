// نظام قاعدة البيانات المحلية للموقع التعليمي
// يستخدم IndexedDB لحفظ البيانات الحقيقية

class EducationDatabase {
    constructor() {
        this.dbName = 'EducationPlatformDB';
        this.version = 1;
        this.db = null;
        this.init();
    }

    // تهيئة قاعدة البيانات
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('خطأ في فتح قاعدة البيانات:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('تم فتح قاعدة البيانات بنجاح');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.createTables();
            };
        });
    }

    // إنشاء الجداول
    createTables() {
        // جدول المستخدمين
        if (!this.db.objectStoreNames.contains('users')) {
            const usersStore = this.db.createObjectStore('users', { keyPath: 'username' });
            usersStore.createIndex('role', 'role', { unique: false });
            usersStore.createIndex('registrationDate', 'registrationDate', { unique: false });
        }

        // جدول الأنشطة
        if (!this.db.objectStoreNames.contains('activities')) {
            const activitiesStore = this.db.createObjectStore('activities', { keyPath: 'id', autoIncrement: true });
            activitiesStore.createIndex('username', 'username', { unique: false });
            activitiesStore.createIndex('type', 'type', { unique: false });
            activitiesStore.createIndex('date', 'date', { unique: false });
        }

        // جدول الدروس
        if (!this.db.objectStoreNames.contains('lessons')) {
            const lessonsStore = this.db.createObjectStore('lessons', { keyPath: 'id', autoIncrement: true });
            lessonsStore.createIndex('username', 'username', { unique: false });
            lessonsStore.createIndex('lessonId', 'lessonId', { unique: false });
            lessonsStore.createIndex('completedDate', 'completedDate', { unique: false });
        }

        // جدول التمارين
        if (!this.db.objectStoreNames.contains('exercises')) {
            const exercisesStore = this.db.createObjectStore('exercises', { keyPath: 'id', autoIncrement: true });
            exercisesStore.createIndex('username', 'username', { unique: false });
            exercisesStore.createIndex('exerciseId', 'exerciseId', { unique: false });
            exercisesStore.createIndex('score', 'score', { unique: false });
            exercisesStore.createIndex('completedDate', 'completedDate', { unique: false });
        }

        // جدول جلسات الدخول
        if (!this.db.objectStoreNames.contains('sessions')) {
            const sessionsStore = this.db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
            sessionsStore.createIndex('username', 'username', { unique: false });
            sessionsStore.createIndex('loginDate', 'loginDate', { unique: false });
            sessionsStore.createIndex('duration', 'duration', { unique: false });
        }

        console.log('تم إنشاء جداول قاعدة البيانات');
    }

    // إضافة مستخدم جديد
    async addUser(userData) {
        const transaction = this.db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        
        const user = {
            username: userData.username,
            name: userData.name,
            role: userData.role,
            registrationDate: new Date().toISOString(),
            lastLogin: null,
            totalStudyTime: 0,
            completedLessons: 0,
            completedExercises: 0,
            averageScore: 0
        };

        return store.add(user);
    }

    // تسجيل نشاط جديد
    async logActivity(username, type, details = {}) {
        const transaction = this.db.transaction(['activities'], 'readwrite');
        const store = transaction.objectStore('activities');
        
        const activity = {
            username: username,
            type: type, // 'login', 'lesson_completed', 'exercise_completed', 'logout'
            details: details,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };

        return store.add(activity);
    }

    // تسجيل إكمال درس
    async completeLesson(username, lessonId, duration = 0) {
        const transaction = this.db.transaction(['lessons', 'users'], 'readwrite');
        const lessonsStore = transaction.objectStore('lessons');
        const usersStore = transaction.objectStore('users');
        
        // إضافة سجل الدرس
        const lessonRecord = {
            username: username,
            lessonId: lessonId,
            completedDate: new Date().toISOString(),
            duration: duration
        };
        
        await lessonsStore.add(lessonRecord);
        
        // تحديث إحصائيات المستخدم
        const user = await this.getUser(username);
        if (user) {
            user.completedLessons += 1;
            user.totalStudyTime += duration;
            await usersStore.put(user);
        }

        // تسجيل النشاط
        await this.logActivity(username, 'lesson_completed', { lessonId, duration });
    }

    // تسجيل إكمال تمرين
    async completeExercise(username, exerciseId, score, maxScore = 100) {
        const transaction = this.db.transaction(['exercises', 'users'], 'readwrite');
        const exercisesStore = transaction.objectStore('exercises');
        const usersStore = transaction.objectStore('users');
        
        // إضافة سجل التمرين
        const exerciseRecord = {
            username: username,
            exerciseId: exerciseId,
            score: score,
            maxScore: maxScore,
            percentage: Math.round((score / maxScore) * 100),
            completedDate: new Date().toISOString()
        };
        
        await exercisesStore.add(exerciseRecord);
        
        // تحديث إحصائيات المستخدم
        const user = await this.getUser(username);
        if (user) {
            user.completedExercises += 1;
            
            // حساب المعدل الجديد
            const allExercises = await this.getUserExercises(username);
            const totalPercentage = allExercises.reduce((sum, ex) => sum + ex.percentage, 0);
            user.averageScore = Math.round(totalPercentage / allExercises.length);
            
            await usersStore.put(user);
        }

        // تسجيل النشاط
        await this.logActivity(username, 'exercise_completed', { exerciseId, score, percentage: exerciseRecord.percentage });
    }

    // تسجيل جلسة دخول
    async logSession(username, duration = 0) {
        const transaction = this.db.transaction(['sessions', 'users'], 'readwrite');
        const sessionsStore = transaction.objectStore('sessions');
        const usersStore = transaction.objectStore('users');
        
        const session = {
            username: username,
            loginDate: new Date().toISOString(),
            duration: duration
        };
        
        await sessionsStore.add(session);
        
        // تحديث آخر تسجيل دخول
        const user = await this.getUser(username);
        if (user) {
            user.lastLogin = new Date().toISOString();
            await usersStore.put(user);
        }

        await this.logActivity(username, 'login');
    }

    // الحصول على بيانات مستخدم
    async getUser(username) {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        
        return new Promise((resolve, reject) => {
            const request = store.get(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // الحصول على جميع المستخدمين
    async getAllUsers() {
        const transaction = this.db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // الحصول على تمارين المستخدم
    async getUserExercises(username) {
        const transaction = this.db.transaction(['exercises'], 'readonly');
        const store = transaction.objectStore('exercises');
        const index = store.index('username');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // الحصول على دروس المستخدم
    async getUserLessons(username) {
        const transaction = this.db.transaction(['lessons'], 'readonly');
        const store = transaction.objectStore('lessons');
        const index = store.index('username');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // الحصول على الإحصائيات العامة
    async getGeneralStats() {
        const users = await this.getAllUsers();
        const students = users.filter(user => user.role === 'student');
        const activeStudents = students.filter(user => {
            if (!user.lastLogin) return false;
            const lastLogin = new Date(user.lastLogin);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return lastLogin > weekAgo;
        });

        // حساب معدل النجاح العام
        let totalScore = 0;
        let totalExercises = 0;
        
        for (const student of students) {
            const exercises = await this.getUserExercises(student.username);
            if (exercises.length > 0) {
                totalScore += exercises.reduce((sum, ex) => sum + ex.percentage, 0);
                totalExercises += exercises.length;
            }
        }

        const averageSuccessRate = totalExercises > 0 ? Math.round(totalScore / totalExercises) : 0;

        // حساب إجمالي الدروس المكتملة
        const allLessons = await this.getAllLessons();
        
        // حساب معدل الحضور (نشاط في آخر أسبوع)
        const attendanceRate = students.length > 0 ? Math.round((activeStudents.length / students.length) * 100) : 0;

        return {
            totalStudents: students.length,
            activeStudents: activeStudents.length,
            totalCourses: 8, // ثابت حالياً
            successRate: averageSuccessRate,
            attendanceRate: attendanceRate,
            totalLessons: allLessons.length,
            totalStudyHours: students.reduce((sum, student) => sum + (student.totalStudyTime || 0), 0)
        };
    }

    // الحصول على جميع الدروس
    async getAllLessons() {
        const transaction = this.db.transaction(['lessons'], 'readonly');
        const store = transaction.objectStore('lessons');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // الحصول على إحصائيات مستخدم محدد
    async getUserStats(username) {
        const user = await this.getUser(username);
        if (!user) return null;

        const lessons = await this.getUserLessons(username);
        const exercises = await this.getUserExercises(username);
        
        // حساب الوقت المستغرق في التعلم
        const totalStudyTime = lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
        
        // حساب المعدل
        const averageScore = exercises.length > 0 
            ? Math.round(exercises.reduce((sum, ex) => sum + ex.percentage, 0) / exercises.length)
            : 0;

        return {
            completedLessons: lessons.length,
            completedExercises: exercises.length,
            averageScore: averageScore,
            totalStudyTime: Math.round(totalStudyTime / 60), // بالدقائق
            lastActivity: user.lastLogin
        };
    }

    // إضافة بيانات تجريبية
    async seedDatabase() {
        try {
            // إضافة مستخدمين تجريبيين
            const testUsers = [
                { username: 'student1', name: 'أحمد محمد', role: 'student' },
                { username: 'student2', name: 'فاطمة علي', role: 'student' },
                { username: 'student3', name: 'محمد أحمد', role: 'student' },
                { username: 'student4', name: 'نور الهدى', role: 'student' },
                { username: 'student5', name: 'عبدالله سالم', role: 'student' },
                { username: 'admin', name: 'المدير', role: 'admin' }
            ];

            for (const userData of testUsers) {
                try {
                    await this.addUser(userData);
                } catch (error) {
                    // المستخدم موجود بالفعل
                }
            }

            // إضافة أنشطة تجريبية
            const students = ['student1', 'student2', 'student3', 'student4', 'student5'];
            
            for (const student of students) {
                // إضافة دروس مكتملة
                for (let i = 1; i <= Math.floor(Math.random() * 15) + 5; i++) {
                    await this.completeLesson(student, `lesson_${i}`, Math.floor(Math.random() * 30) + 10);
                }

                // إضافة تمارين مكتملة
                for (let i = 1; i <= Math.floor(Math.random() * 10) + 3; i++) {
                    const score = Math.floor(Math.random() * 40) + 60; // درجات بين 60-100
                    await this.completeExercise(student, `exercise_${i}`, score, 100);
                }

                // تسجيل جلسات دخول
                for (let i = 0; i < Math.floor(Math.random() * 10) + 5; i++) {
                    await this.logSession(student, Math.floor(Math.random() * 120) + 30);
                }
            }

            console.log('تم إضافة البيانات التجريبية بنجاح');
        } catch (error) {
            console.error('خطأ في إضافة البيانات التجريبية:', error);
        }
    }
}

// إنشاء مثيل عام من قاعدة البيانات
window.educationDB = new EducationDatabase();

// وظائف مساعدة للاستخدام العام
window.dbUtils = {
    // تهيئة قاعدة البيانات مع البيانات التجريبية
    async initializeWithSampleData() {
        await window.educationDB.init();
        await window.educationDB.seedDatabase();
        console.log('تم تهيئة قاعدة البيانات مع البيانات التجريبية');
    },

    // الحصول على الإحصائيات المحدثة
    async getUpdatedStats() {
        return await window.educationDB.getGeneralStats();
    },

    // الحصول على إحصائيات مستخدم
    async getUserStats(username) {
        return await window.educationDB.getUserStats(username);
    },

    // تسجيل نشاط جديد
    async logUserActivity(username, type, details) {
        return await window.educationDB.logActivity(username, type, details);
    },

    // إكمال درس
    async completeLesson(username, lessonId) {
        const duration = Math.floor(Math.random() * 30) + 10; // مدة عشوائية
        return await window.educationDB.completeLesson(username, lessonId, duration);
    },

    // إكمال تمرين
    async completeExercise(username, exerciseId, score = null) {
        const finalScore = score || Math.floor(Math.random() * 40) + 60;
        return await window.educationDB.completeExercise(username, exerciseId, finalScore, 100);
    }
};

