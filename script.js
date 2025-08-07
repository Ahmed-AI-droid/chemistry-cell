import { firebaseDb } from './firebase_db.js';

// ملف JavaScript المشترك للموقع التعليمي

// بيانات المستخدمين التجريبية (في التطبيق الحقيقي ستكون في قاعدة بيانات)
const users = {};

// متغيرات لتتبع الجلسة الحالية
let sessionStartTime = null;
let currentUser = null;

// وظائف المساعدة
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} fade-in`;
    alertDiv.textContent = message;
    
    // إزالة أي تنبيهات سابقة
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // إضافة التنبيه الجديد
    const container = document.querySelector('.form-container') || document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        
        // إزالة التنبيه بعد 5 ثوان
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('خطأ في حفظ البيانات:', error);
        return false;
    }
}

function getFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('خطأ في قراءة البيانات:', error);
        return null;
    }
}

function isLoggedIn() {
    return getFromLocalStorage('currentUser') !== null;
}

function getCurrentUser() {
    return getFromLocalStorage('currentUser');
}

function logout() {
    localStorage.removeItem('currentUser');
    showAlert('تم تسجيل الخروج بنجاح', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

// وظائف تسجيل الدخول
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    
    if (!username || !password) {
        showAlert("يرجى إدخال اسم المستخدم وكلمة المرور", "error");
        return;
    }
    
    try {
        const user = await firebaseDb.checkUser(username, password);
        if (user) {
            saveToLocalStorage("currentUser", { ...user, loginTime: new Date().toISOString() });
            currentUser = user;
            sessionStartTime = Date.now();
            
            // تسجيل الجلسة في قاعدة البيانات
            await firebaseDb.logLogin(username);
            
            showAlert(`مرحباً ${user.name}، جاري تحويلك...`, "success");
            
            // تحويل المستخدم حسب دوره
            setTimeout(() => {
                if (user.role === "admin") {
                    window.location.href = "admin.html";
                } else if (user.role === "student" || user.role === "teacher") {
                    window.location.href = "student.html";
                }
            }, 2000);
        } else {
            showAlert("اسم المستخدم أو كلمة المرور غير صحيحة", "error");
        }
    } catch (error) {
        console.error("خطأ في تسجيل الدخول:", error);
        showAlert("حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.", "error");
    }
}

// وظائف حماية الصفحات
async function protectPage(allowedRoles = []) {
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        showAlert("يجب تسجيل الدخول أولاً", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        return false;
    }
    
    // التحقق من وجود المستخدم في Firebase
    try {
        const userInDb = await firebaseDb.checkUser(currentUser.username, currentUser.password); // قد تحتاج لتخزين كلمة المرور أو استخدام طريقة مصادقة أخرى
        if (!userInDb) {
            showAlert("جلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.", "error");
            localStorage.removeItem("currentUser");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2000);
            return false;
        }
    } catch (error) {
        console.error("خطأ في التحقق من المستخدم:", error);
        showAlert("حدث خطأ أثناء التحقق من الجلسة. يرجى تسجيل الدخول مرة أخرى.", "error");
        localStorage.removeItem("currentUser");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
        return false;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
        showAlert("ليس لديك صلاحية للوصول إلى هذه الصفحة", "error");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);
        return false;
    }
    
    return true;
}

// وظائف تحديث واجهة المستخدم
function updateUserInterface() {
    const currentUser = getCurrentUser();
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const loginTimeElement = document.getElementById('loginTime');
    
    if (currentUser && userNameElement) {
        userNameElement.textContent = currentUser.name;
    }
    
    if (currentUser && userRoleElement) {
        const roleNames = {
            'admin': 'مدير النظام',
            'student': 'طالب',
            'teacher': 'معلم'
        };
        userRoleElement.textContent = roleNames[currentUser.role] || currentUser.role;
    }
    
    if (currentUser && loginTimeElement) {
        const loginDate = new Date(currentUser.loginTime);
        loginTimeElement.textContent = loginDate.toLocaleString('ar-EG');
    }
}

// وظائف التنقل
function setupNavigation() {
    const currentUser = getCurrentUser();
    const navMenu = document.querySelector('.nav-menu');
    
    if (navMenu && currentUser) {
        // إضافة رابط تسجيل الخروج
        const logoutItem = document.createElement('li');
        logoutItem.innerHTML = '<a href="#" onclick="logout()">تسجيل الخروج</a>';
        navMenu.appendChild(logoutItem);
        
        // إضافة اسم المستخدم
        const userItem = document.createElement('li');
        userItem.innerHTML = `<span style="color: var(--primary-color); font-weight: 600;">مرحباً، ${currentUser.name}</span>`;
        navMenu.appendChild(userItem);
    }
}

// وظائف تحميل المحتوى
async function loadContent(contentType) {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;
    
    // إظهار اللودر
    contentArea.innerHTML = `<div class="loader"></div><p class="text-center">جاري تحميل المحتوى...</p>`;
    
    // تسجيل النشاط (يمكن تفعيله لاحقًا إذا أردت تتبع الأنشطة في Firebase)
    const user = getCurrentUser();
    if (user) {
        // await firebaseDb.logActivity(user.username, "content_viewed", { contentType });
    }
    
    // محاكاة تحميل المحتوى
    setTimeout(async () => {
        let content = "";
        
        switch (contentType) {
            case "lessons":
                content = generateLessonsContent();
                break;
            case "exercises":
                content = generateExercisesContent();
                break;
            case "grades":
                content = await generateGradesContent();
                break;
            default:
                content = "<p class=\"text-center\">المحتوى غير متوفر حالياً</p>";
        }
        
        contentArea.innerHTML = content;
    }, 1500);
}

// توليد محتوى الدروس مع إمكانية التفاعل
function generateLessonsContent() {
    return `
        <div class="grid grid-3">
            <div class="card">
                <h3 class="card-title">الدرس الأول: مقدمة في الكيمياء</h3>
                <p class="card-text">تعرف على أساسيات علم الكيمياء والمفاهيم الأولية</p>
                <button class="btn btn-primary mt-3" onclick="startLesson('lesson_1')">بدء الدرس</button>
            </div>
            <div class="card">
                <h3 class="card-title">الدرس الثاني: الذرة والجزيء</h3>
                <p class="card-text">فهم بنية الذرة وكيفية تكوين الجزيئات</p>
                <button class="btn btn-primary mt-3" onclick="startLesson('lesson_2')">بدء الدرس</button>
            </div>
            <div class="card">
                <h3 class="card-title">الدرس الثالث: التفاعلات الكيميائية</h3>
                <p class="card-text">دراسة أنواع التفاعلات الكيميائية المختلفة</p>
                <button class="btn btn-primary mt-3" onclick="startLesson('lesson_3')">بدء الدرس</button>
            </div>
            <div class="card">
                <h3 class="card-title">الدرس الرابع: الروابط الكيميائية</h3>
                <p class="card-text">أنواع الروابط وخصائصها</p>
                <button class="btn btn-primary mt-3" onclick="startLesson('lesson_4')">بدء الدرس</button>
            </div>
            <div class="card">
                <h3 class="card-title">الدرس الخامس: الحموض والقواعد</h3>
                <p class="card-text">خصائص الحموض والقواعد وتفاعلاتها</p>
                <button class="btn btn-primary mt-3" onclick="startLesson('lesson_5')">بدء الدرس</button>
            </div>
            <div class="card">
                <h3 class="card-title">الدرس السادس: الكيمياء العضوية</h3>
                <p class="card-text">مقدمة في المركبات العضوية</p>
                <button class="btn btn-primary mt-3" onclick="startLesson('lesson_6')">بدء الدرس</button>
            </div>
        </div>
    `;
}

// توليد محتوى التمارين مع إمكانية التفاعل
function generateExercisesContent() {
    return `
        <div class="grid grid-2">
            <div class="card">
                <h3 class="card-title">تمارين الوحدة الأولى</h3>
                <p class="card-text">10 أسئلة متنوعة على مقدمة الكيمياء</p>
                <button class="btn btn-secondary mt-3" onclick="startExercise('exercise_1')">بدء التمرين</button>
            </div>
            <div class="card">
                <h3 class="card-title">تمارين الوحدة الثانية</h3>
                <p class="card-text">15 سؤال على الذرة والجزيء</p>
                <button class="btn btn-secondary mt-3" onclick="startExercise('exercise_2')">بدء التمرين</button>
            </div>
            <div class="card">
                <h3 class="card-title">تمارين التفاعلات الكيميائية</h3>
                <p class="card-text">12 سؤال على التفاعلات المختلفة</p>
                <button class="btn btn-secondary mt-3" onclick="startExercise('exercise_3')">بدء التمرين</button>
            </div>
            <div class="card">
                <h3 class="card-title">اختبار شامل</h3>
                <p class="card-text">25 سؤال شامل على جميع الوحدات</p>
                <button class="btn btn-secondary mt-3" onclick="startExercise('comprehensive_test')">بدء الاختبار</button>
            </div>
        </div>
    `;
}

// توليد محتوى الدرجات من قاعدة البيانات
async function generateGradesContent() {
    const user = getCurrentUser();
    if (!user) {
        return `
            <div class="card">
                <h3 class="card-title">درجاتي</h3>
                <p>لا توجد درجات متاحة حالياً. يرجى تسجيل الدخول.</p>
            </div>
        `;
    }

    try {
        const userStats = await firebaseDb.getUserStats(user.username);
        const exercises = userStats ? userStats.exercises || [] : [];
        
        if (exercises.length === 0) {
            return `
                <div class="card">
                    <h3 class="card-title">درجاتي</h3>
                    <p>لم تقم بحل أي تمارين بعد. ابدأ بحل التمارين لرؤية درجاتك هنا.</p>
                    <button class="btn btn-primary mt-3" onclick="loadContent('exercises')">ابدأ التمارين</button>
                </div>
            `;
        }

        let tableRows = "";
        exercises.forEach(exercise => {
            const date = new Date(exercise.timestamp).toLocaleDateString("ar-EG");
            const exerciseName = getExerciseName(exercise.id);
            tableRows += `
                <tr>
                    <td style="padding: 1rem; border: 1px solid var(--border-color);">${exerciseName}</td>
                    <td style="padding: 1rem; border: 1px solid var(--border-color);">${exercise.score}%</td>
                    <td style="padding: 1rem; border: 1px solid var(--border-color);">${date}</td>
                </tr>
            `;
        });

        const averageScore = userStats ? userStats.averageScore : 0;

        return `
            <div class="card">
                <h3 class="card-title">درجاتي</h3>
                <div class="mb-3">
                    <p><strong>المعدل العام:</strong> <span style="color: var(--primary-color); font-size: 1.5rem; font-weight: bold;">${averageScore}%</span></p>
                    <p><strong>عدد التمارين المكتملة:</strong> ${exercises.length}</p>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background-color: var(--background-light);">
                        <th style="padding: 1rem; border: 1px solid var(--border-color);">التمرين</th>
                        <th style="padding: 1rem; border: 1px solid var(--border-color);">الدرجة</th>
                        <th style="padding: 1rem; border: 1px solid var(--border-color);">التاريخ</th>
                    </tr>
                    ${tableRows}
                </table>
            </div>
        `;
    } catch (error) {
        console.error("خطأ في تحميل الدرجات:", error);
        return `
            <div class="card">
                <h3 class="card-title">درجاتي</h3>
                <p>حدث خطأ في تحميل الدرجات. يرجى المحاولة مرة أخرى.</p>
            </div>
        `;
    }
}

// وظيفة مساعدة للحصول على اسم التمرين
function getExerciseName(exerciseId) {
    const exerciseNames = {
        'exercise_1': 'تمارين الوحدة الأولى',
        'exercise_2': 'تمارين الوحدة الثانية', 
        'exercise_3': 'تمارين التفاعلات الكيميائية',
        'comprehensive_test': 'الاختبار الشامل'
    };
    return exerciseNames[exerciseId] || exerciseId;
}

// بدء درس جديد
async function startLesson(lessonId) {
    const user = getCurrentUser();
    if (!user) return;

    showAlert("تم بدء الدرس! جاري تسجيل التقدم...", "success");
    
    // محاكاة إكمال الدرس
    setTimeout(async () => {
        try {
            await firebaseDb.completeLesson(user.username, lessonId);
            showAlert("تم إكمال الدرس بنجاح! تم تحديث إحصائياتك.", "success");
            
            // تحديث الإحصائيات في الصفحة
            updateUserStats();
        } catch (error) {
            console.error("خطأ في إكمال الدرس:", error);
            showAlert("حدث خطأ أثناء إكمال الدرس. يرجى المحاولة مرة أخرى.", "error");
        }
    }, 3000);
}

// بدء تمرين جديد
async function startExercise(exerciseId) {
    const user = getCurrentUser();
    if (!user) return;

    showAlert("تم بدء التمرين! جاري تسجيل النتيجة...", "info");
    
    // محاكاة إكمال التمرين
    setTimeout(async () => {
        try {
            const score = Math.floor(Math.random() * 40) + 60; // درجة عشوائية بين 60-100
            await firebaseDb.completeExercise(user.username, exerciseId, score);
            showAlert(`تم إكمال التمرين! حصلت على ${score}% - تم تحديث درجاتك.`, "success");
            
            // تحديث الإحصائيات في الصفحة
            updateUserStats();
            
            // إذا كان المستخدم في صفحة الدرجات، قم بتحديثها
            if (document.getElementById("contentArea")) {
                loadContent("grades");
            }
        } catch (error) {
            console.error("خطأ في إكمال التمرين:", error);
            showAlert("حدث خطأ أثناء إكمال التمرين. يرجى المحاولة مرة أخرى.", "error");
        }
    }, 2000);
}

// تحديث الإحصائيات في صفحة الطالب
async function updateUserStats() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const userStats = await firebaseDb.getUserStats(user.username);
        if (userStats) {
            document.getElementById('totalLessonsCompleted').textContent = userStats.lessonsCompleted || 0;
            document.getElementById('totalExercisesCompleted').textContent = userStats.exercisesCompleted || 0;
            document.getElementById('averageScore').textContent = (userStats.averageScore || 0) + '%';
            document.getElementById('totalStudyTime').textContent = formatStudyTime(userStats.totalStudyTime || 0);
        }
    } catch (error) {
        console.error("خطأ في تحديث إحصائيات المستخدم:", error);
    }
}

// وظيفة مساعدة لتنسيق وقت الدراسة
function formatStudyTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours} ساعة، ${minutes} دقيقة، ${remainingSeconds} ثانية`;
}

// وظائف الإدارة
async function loadAdminContent(section) {
    const adminContent = document.getElementById("adminContent");
    if (!adminContent) return;
    
    adminContent.innerHTML = `<div class="loader"></div><p class="text-center">جاري تحميل البيانات...</p>`;
    
    try {
        let content = "";
        
        switch (section) {
            case "students":
                const totalStudents = await firebaseDb.getTotalUsersByRole("student");
                const activeStudents = await firebaseDb.getActiveUsersByRole("student");
                content = `
                    <div class="card">
                        <h3 class="card-title">إدارة الطلاب</h3>
                        <div class="grid grid-2 mt-3">
                            <div class="card">
                                <h4>إجمالي الطلاب</h4>
                                <p style="font-size: 2rem; color: var(--primary-color); font-weight: bold;">${totalStudents}</p>
                            </div>
                            <div class="card">
                                <h4>الطلاب النشطون (آخر 24 ساعة)</h4>
                                <p style="font-size: 2rem; color: var(--primary-color); font-weight: bold;">${activeStudents}</p>
                            </div>
                        </div>
                        <button class="btn btn-primary mt-3" onclick="loadAdminContent('manageUsers')">إدارة المستخدمين</button>
                    </div>
                `;
                break;
            case "courses":
                const totalLessons = await firebaseDb.getTotalLessons();
                const completedLessons = await firebaseDb.getTotalCompletedLessons();
                content = `
                    <div class="card">
                        <h3 class="card-title">إدارة الدورات</h3>
                        <div class="grid grid-2 mt-3">
                            <div class="card">
                                <h4>إجمالي الدروس</h4>
                                <p style="font-size: 2rem; color: var(--primary-color); font-weight: bold;">${totalLessons}</p>
                            </div>
                            <div class="card">
                                <h4>الدروس المكتملة</h4>
                                <p style="font-size: 2rem; color: var(--primary-color); font-weight: bold;">${completedLessons}</p>
                            </div>
                        </div>
                        <button class="btn btn-primary mt-3" onclick="loadAdminContent('manageCourses')">إدارة الدروس</button>
                    </div>
                `;
                break;
            case "analytics":
                const totalExercises = await firebaseDb.getTotalExercises();
                const averageOverallScore = await firebaseDb.getAverageOverallScore();
                content = `
                    <div class="card">
                        <h3 class="card-title">التحليلات والإحصائيات</h3>
                        <div class="grid grid-2 mt-3">
                            <div class="card">
                                <h4>إجمالي التمارين</h4>
                                <p style="font-size: 2rem; color: var(--primary-color); font-weight: bold;">${totalExercises}</p>
                            </div>
                            <div class="card">
                                <h4>متوسط الدرجات</h4>
                                <p style="font-size: 2rem; color: var(--primary-color); font-weight: bold;">${averageOverallScore}%</p>
                            </div>
                        </div>
                        <button class="btn btn-primary mt-3" onclick="loadAdminContent('viewReports')">عرض التقارير</button>
                    </div>
                `;
                break;
            case "manageUsers":
                const usersList = await firebaseDb.getAllUsers();
                let usersTableRows = "";
                usersList.forEach(user => {
                    usersTableRows += `
                        <tr>
                            <td style="padding: 1rem; border: 1px solid var(--border-color);">${user.username}</td>
                            <td style="padding: 1rem; border: 1px solid var(--border-color);">${user.role}</td>
                            <td style="padding: 1rem; border: 1px solid var(--border-color);">${new Date(user.createdAt).toLocaleDateString("ar-EG")}</td>
                            <td style="padding: 1rem; border: 1px solid var(--border-color);">
                                <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.username}')">حذف</button>
                            </td>
                        </tr>
                    `;
                });
                content = `
                    <div class="card">
                        <h3 class="card-title">إدارة المستخدمين</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                            <tr style="background-color: var(--background-light);">
                                <th style="padding: 1rem; border: 1px solid var(--border-color);">اسم المستخدم</th>
                                <th style="padding: 1rem; border: 1px solid var(--border-color);">الدور</th>
                                <th style="padding: 1rem; border: 1px solid var(--border-color);">تاريخ التسجيل</th>
                                <th style="padding: 1rem; border: 1px solid var(--border-color);">إجراءات</th>
                            </tr>
                            ${usersTableRows}
                        </table>
                    </div>
                `;
                break;
            case "manageCourses":
                content = `
                    <div class="card">
                        <h3 class="card-title">إدارة الدروس</h3>
                        <p>هنا يمكنك إضافة وتعديل وحذف الدروس.</p>
                        <button class="btn btn-primary mt-3">إضافة درس جديد</button>
                    </div>
                `;
                break;
            case "viewReports":
                content = `
                    <div class="card">
                        <h3 class="card-title">التقارير</h3>
                        <p>هنا يمكنك عرض تقارير مفصلة عن أداء الطلاب والدورات.</p>
                        <button class="btn btn-primary mt-3">توليد تقرير</button>
                    </div>
                `;
                break;
            default:
                content = "<p class=\"text-center\">القسم غير موجود.</p>";
        }
        
        adminContent.innerHTML = content;
    } catch (error) {
        console.error("خطأ في تحميل محتوى الإدارة:", error);
        adminContent.innerHTML = "<p class=\"text-center\">حدث خطأ أثناء تحميل المحتوى. يرجى المحاولة مرة أخرى.</p>";
    }
}

// وظيفة لحذف مستخدم (لصفحة الإدارة)
async function deleteUser(username) {
    if (confirm(`هل أنت متأكد من حذف المستخدم ${username}؟`)) {
        try {
            await firebaseDb.deleteUser(username);
            showAlert(`تم حذف المستخدم ${username} بنجاح.`, 'success');
            loadAdminContent('manageUsers'); // تحديث قائمة المستخدمين
        } catch (error) {
            console.error("خطأ في حذف المستخدم:", error);
            showAlert("حدث خطأ أثناء حذف المستخدم. يرجى المحاولة مرة أخرى.", 'error');
        }
    }
}

// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    
    if (path.includes('login.html')) {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    } else if (path.includes('student.html')) {
        if (await protectPage(['student', 'teacher'])) {
            updateUserInterface();
            setupNavigation();
            updateUserStats(); // تحديث الإحصائيات عند تحميل الصفحة
            // تحميل المحتوى الافتراضي (مثلاً الدروس)
            loadContent('lessons');
        }
    } else if (path.includes('admin.html')) {
        if (await protectPage(['admin'])) {
            updateUserInterface();
            setupNavigation();
            loadAdminContent('students'); // تحميل محتوى الإدارة الافتراضي
        }
    } else if (path.includes('index.html')) {
        // لا شيء خاص لصفحة البداية
    }
});

// جعل الوظائف متاحة عالمياً (للاستخدام في HTML)
window.handleLogin = handleLogin;
window.logout = logout;
window.loadContent = loadContent;
window.startLesson = startLesson;
window.startExercise = startExercise;
window.loadAdminContent = loadAdminContent;
window.deleteUser = deleteUser;
window.updateUserStats = updateUserStats;


