import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const db = getFirestore();

const firebaseDb = {
    // تهيئة البيانات التجريبية في Firestore
    initializeWithSampleData: async () => {
        console.log("Initializing Firebase with sample data...");
        const usersCollectionRef = collection(db, "users");
        const activitiesCollectionRef = collection(db, "activities");
        const lessonsCollectionRef = collection(db, "lessons");
        const exercisesCollectionRef = collection(db, "exercises");
        const sessionsCollectionRef = collection(db, "sessions");

        const sampleUsers = [
            { username: "admin", password: "admin123", name: "مدير النظام", role: "admin", lastLogin: new Date().toISOString() },
            { username: "student1", password: "student123", name: "أحمد محمد", role: "student", lastLogin: new Date().toISOString() },
            { username: "student2", password: "student123", name: "فاطمة علي", role: "student", lastLogin: new Date().toISOString() },
            { username: "student3", password: "student123", name: "خالد محمود", role: "student", lastLogin: new Date().toISOString() },
            { username: "student4", password: "student123", name: "ليلى سعيد", role: "student", lastLogin: new Date().toISOString() },
            { username: "student5", password: "student123", name: "يوسف حسن", role: "student", lastLogin: new Date().toISOString() }
        ];

        for (const user of sampleUsers) {
            await setDoc(doc(usersCollectionRef, user.username), user);
            // تهيئة إحصائيات المستخدم إذا لم تكن موجودة
            const userStatsDocRef = doc(db, "userStats", user.username);
            const userStatsDoc = await getDoc(userStatsDocRef);
            if (!userStatsDoc.exists()) {
                await setDoc(userStatsDocRef, {
                    username: user.username,
                    completedLessons: 0,
                    completedExercises: 0,
                    totalStudyTime: 0,
                    averageScore: 0,
                    lessons: [],
                    exercises: []
                });
            }
        }

        console.log("Sample users initialized.");
    },

    // التحقق من المستخدم
    checkUser: async (username, password) => {
        const userDocRef = doc(db, "users", username);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().password === password) {
            return userDoc.data();
        }
        return null;
    },

    // تسجيل الدخول وتحديث آخر تسجيل دخول
    logLogin: async (username) => {
        const userDocRef = doc(db, "users", username);
        await updateDoc(userDocRef, { lastLogin: new Date().toISOString() });
    },

    // تسجيل جلسة دراسية
    logSession: async (username, durationMinutes) => {
        const sessionDocRef = doc(collection(db, "sessions"));
        await setDoc(sessionDocRef, {
            username: username,
            duration: durationMinutes,
            timestamp: new Date().toISOString()
        });
        // تحديث إجمالي وقت الدراسة للمستخدم
        const userStatsDocRef = doc(db, "userStats", username);
        const userStatsDoc = await getDoc(userStatsDocRef);
        if (userStatsDoc.exists()) {
            const currentStudyTime = userStatsDoc.data().totalStudyTime || 0;
            await updateDoc(userStatsDocRef, { totalStudyTime: currentStudyTime + durationMinutes });
        }
    },

    // إكمال درس
    completeLesson: async (username, lessonId) => {
        const userStatsDocRef = doc(db, "userStats", username);
        const userStatsDoc = await getDoc(userStatsDocRef);
        if (userStatsDoc.exists()) {
            const currentLessons = userStatsDoc.data().lessons || [];
            if (!currentLessons.includes(lessonId)) {
                await updateDoc(userStatsDocRef, {
                    completedLessons: (userStatsDoc.data().completedLessons || 0) + 1,
                    lessons: arrayUnion(lessonId)
                });
            }
        }
    },

    // إكمال تمرين
    completeExercise: async (username, exerciseId, score) => {
        const userStatsDocRef = doc(db, "userStats", username);
        const userStatsDoc = await getDoc(userStatsDocRef);
        if (userStatsDoc.exists()) {
            const currentExercises = userStatsDoc.data().exercises || [];
            const currentCompletedExercises = userStatsDoc.data().completedExercises || 0;
            const currentAverageScore = userStatsDoc.data().averageScore || 0;

            let newAverageScore = currentAverageScore;
            if (!currentExercises.some(ex => ex.id === exerciseId)) {
                // إذا كان التمرين جديدًا، أضف الدرجة إلى المتوسط
                newAverageScore = ((currentAverageScore * currentCompletedExercises) + score) / (currentCompletedExercises + 1);
                await updateDoc(userStatsDocRef, {
                    completedExercises: currentCompletedExercises + 1,
                    exercises: arrayUnion({ id: exerciseId, score: score, timestamp: new Date().toISOString() }),
                    averageScore: newAverageScore
                });
            } else {
                // إذا كان التمرين موجودًا، قم بتحديث الدرجة
                const updatedExercises = currentExercises.map(ex => ex.id === exerciseId ? { ...ex, score: score, timestamp: new Date().toISOString() } : ex);
                const totalScores = updatedExercises.reduce((sum, ex) => sum + ex.score, 0);
                newAverageScore = totalScores / updatedExercises.length;
                await updateDoc(userStatsDocRef, {
                    exercises: updatedExercises,
                    averageScore: newAverageScore
                });
            }
        }
    },

    // الحصول على إحصائيات مستخدم محدد
    getUserStats: async (username) => {
        const userStatsDocRef = doc(db, "userStats", username);
        const userStatsDoc = await getDoc(userStatsDocRef);
        if (userStatsDoc.exists()) {
            return userStatsDoc.data();
        }
        return null;
    },

    // الحصول على جميع المستخدمين
    getAllUsers: async () => {
        const usersSnapshot = await getDocs(collection(db, "users"));
        return usersSnapshot.docs.map(doc => doc.data());
    },

    // الحصول على الإحصائيات العامة
    getGeneralStats: async () => {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const allUsers = usersSnapshot.docs.map(doc => doc.data());
        const totalStudents = allUsers.filter(user => user.role === "student").length;

        let totalCompletedLessons = 0;
        let totalCompletedExercises = 0;
        let totalAverageScore = 0;
        let studentCountForAverage = 0;
        let activeStudentsCount = 0;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        for (const user of allUsers) {
            if (user.role === "student") {
                const userStats = await firebaseDb.getUserStats(user.username);
                if (userStats) {
                    totalCompletedLessons += userStats.completedLessons || 0;
                    totalCompletedExercises += userStats.completedExercises || 0;
                    if (userStats.averageScore !== undefined) {
                        totalAverageScore += userStats.averageScore;
                        studentCountForAverage++;
                    }
                }
                if (user.lastLogin && new Date(user.lastLogin) > oneWeekAgo) {
                    activeStudentsCount++;
                }
            }
        }

        const successRate = studentCountForAverage > 0 ? (totalAverageScore / studentCountForAverage).toFixed(2) : 0;
        const attendanceRate = totalStudents > 0 ? ((activeStudentsCount / totalStudents) * 100).toFixed(2) : 0;

        return {
            totalStudents: totalStudents,
            activeStudents: activeStudentsCount,
            totalCourses: 3, // مثال: عدد المقررات الثابتة
            successRate: parseFloat(successRate),
            attendanceRate: parseFloat(attendanceRate),
            totalCompletedLessons: totalCompletedLessons,
            totalCompletedExercises: totalCompletedExercises
        };
    },

    // مسح جميع البيانات (للتطوير فقط)
    clearAllData: async () => {
        console.warn("Clearing all data from Firestore collections...");
        const collections = ["users", "activities", "lessons", "exercises", "sessions", "userStats"];
        for (const colName of collections) {
            const q = query(collection(db, colName));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Collection ${colName} cleared.`);
        }
    }
};

window.firebaseDb = firebaseDb;


