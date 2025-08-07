// ملف JavaScript المشترك للموقع التعليمي

// بيانات المستخدمين التجريبية (في التطبيق الحقيقي ستكون في قاعدة بيانات)
const users = {
    'admin': { password: 'admin123', role: 'admin', name: 'المدير' },
    'student1': { password: 'student123', role: 'student', name: 'أحمد محمد' },
    'student2': { password: 'student123', role: 'student', name: 'فاطمة علي' },
    'student3': { password: 'student123', role: 'student', name: 'محمد أحمد' },
    'student4': { password: 'student123', role: 'student', name: 'نور الهدى' },
    'student5': { password: 'student123', role: 'student', name: 'عبدالله سالم' },
    'teacher1': { password: 'teacher123', role: 'teacher', name: 'د. محمد أحمد' }
};

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
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showAlert('يرجى إدخال اسم المستخدم وكلمة المرور', 'error');
        return;
    }
    
    // التحقق من بيانات المستخدم
    if (users[username] && users[username].password === password) {
        const user = {
            username: username,
            name: users[username].name,
            role: users[username].role,
            loginTime: new Date().toISOString()
        };
        
        saveToLocalStorage('currentUser', user);
        currentUser = user;
        sessionStartTime = Date.now();
        
        // تسجيل الجلسة في قاعدة البيانات
        if (window.educationDB && window.educationDB.db) {
            window.educationDB.logSession(username);
        }
        
        showAlert(`مرحباً ${user.name}، جاري تحويلك...`, 'success');
        
        // تحويل المستخدم حسب دوره
        setTimeout(() => {
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else if (user.role === 'student' || user.role === 'teacher') {
                window.location.href = 'student.html';
            }
        }, 2000);
    } else {
        showAlert('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
    }
}

// وظائف حماية الصفحات
function protectPage(allowedRoles = []) {
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
        showAlert('يجب تسجيل الدخول أولاً', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
        showAlert('ليس لديك صلاحية للوصول إلى هذه الصفحة', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
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
function loadContent(contentType) {
    const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;
    
    // إظهار اللودر
    contentArea.innerHTML = '<div class="loader"></div><p class="text-center">جاري تحميل المحتوى...</p>';
    
    // تسجيل النشاط
    const user = getCurrentUser();
    if (user && window.educationDB && window.educationDB.db) {
        window.educationDB.logActivity(user.username, 'content_viewed', { contentType });
    }
    
    // محاكاة تحميل المحتوى
    setTimeout(() => {
        let content = '';
        
        switch (contentType) {
            case 'lessons':
                content = generateLessonsContent();
                break;
            case 'exercises':
                content = generateExercisesContent();
                break;
            case 'grades':
                content = generateGradesContent();
                break;
            default:
                content = '<p class="text-center">المحتوى غير متوفر حالياً</p>';
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
    if (!user || !window.educationDB || !window.educationDB.db) {
        return `
            <div class="card">
                <h3 class="card-title">درجاتي</h3>
                <p>لا توجد درجات متاحة حالياً</p>
            </div>
        `;
    }

    try {
        const exercises = await window.educationDB.getUserExercises(user.username);
        
        if (exercises.length === 0) {
            return `
                <div class="card">
                    <h3 class="card-title">درجاتي</h3>
                    <p>لم تقم بحل أي تمارين بعد. ابدأ بحل التمارين لرؤية درجاتك هنا.</p>
                    <button class="btn btn-primary mt-3" onclick="loadContent('exercises')">ابدأ التمارين</button>
                </div>
            `;
        }

        let tableRows = '';
        exercises.forEach(exercise => {
            const date = new Date(exercise.completedDate).toLocaleDateString('ar-EG');
            const exerciseName = getExerciseName(exercise.exerciseId);
            tableRows += `
                <tr>
                    <td style="padding: 1rem; border: 1px solid var(--border-color);">${exerciseName}</td>
                    <td style="padding: 1rem; border: 1px solid var(--border-color);">${exercise.percentage}%</td>
                    <td style="padding: 1rem; border: 1px solid var(--border-color);">${date}</td>
                </tr>
            `;
        });

        const averageScore = Math.round(exercises.reduce((sum, ex) => sum + ex.percentage, 0) / exercises.length);

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
        console.error('خطأ في تحميل الدرجات:', error);
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

    showAlert('تم بدء الدرس! جاري تسجيل التقدم...', 'success');
    
    // محاكاة إكمال الدرس
    setTimeout(async () => {
        if (window.dbUtils) {
            await window.dbUtils.completeLesson(user.username, lessonId);
            showAlert('تم إكمال الدرس بنجاح! تم تحديث إحصائياتك.', 'success');
            
            // تحديث الإحصائيات في الصفحة
            updateUserStats();
        }
    }, 3000);
}

// بدء تمرين جديد
async function startExercise(exerciseId) {
    const user = getCurrentUser();
    if (!user) return;

    showAlert('تم بدء التمرين! جاري تسجيل النتيجة...', 'info');
    
    // محاكاة إكمال التمرين
    setTimeout(async () => {
        if (window.dbUtils) {
            const score = Math.floor(Math.random() * 40) + 60; // درجة عشوائية بين 60-100
            await window.dbUtils.completeExercise(user.username, exerciseId, score);
            showAlert(`تم إكمال التمرين! حصلت على ${score}% - تم تحديث درجاتك.`, 'success');
            
            // تحديث الإحصائيات في الصفحة
            updateUserStats();
            
            // إذا كان المستخدم في صفحة الدرجات، قم بتحديثها
            if (document.getElementById('contentArea')) {
                loadContent('grades');
            }
        }
    }, 2000);
}

// وظائف إدارة النظام
function loadAdminContent(section) {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    adminContent.innerHTML = '<div class="loader"></div><p class="text-center">جاري تحميل البيانات...</p>';
    
    setTimeout(() => {
        let content = '';
        
        switch (section) {
            case 'students':
                content = `
                    <div class="card">
                        <h3 class="card-title">إدارة الطلاب</h3>
                        <div class="grid grid-2 mt-3">
                            <div class="card">
                                <h4>إجمالي الطلاب</h4>
                                <p style="font-size: 2rem; color: var(--primary-color); font-weight: bold;">156</p>
                            </div>
                            <div class="card">
                                <h4>الطلاب النشطون</h4>
                                <p style="font-size: 2rem; color: var(--secondary-color); font-weight: bold;">142</p>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'courses':
                content = `
                    <div class="card">
                        <h3 class="card-title">إدارة المقررات</h3>
                        <div class="grid grid-3 mt-3">
                            <div class="card">
                                <h4>الكيمياء العامة</h4>
                                <p>12 درس، 45 طالب</p>
                                <button class="btn btn-primary mt-2">إدارة</button>
                            </div>
                            <div class="card">
                                <h4>الكيمياء العضوية</h4>
                                <p>8 دروس، 32 طالب</p>
                                <button class="btn btn-primary mt-2">إدارة</button>
                            </div>
                            <div class="card">
                                <h4>الكيمياء التحليلية</h4>
                                <p>10 دروس، 28 طالب</p>
                                <button class="btn btn-primary mt-2">إدارة</button>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'reports':
                content = `
                    <div class="card">
                        <h3 class="card-title">التقارير والإحصائيات</h3>
                        <div class="grid grid-2 mt-3">
                            <div class="card">
                                <h4>معدل الحضور</h4>
                                <p style="font-size: 2rem; color: var(--accent-color); font-weight: bold;">87%</p>
                            </div>
                            <div class="card">
                                <h4>معدل النجاح</h4>
                                <p style="font-size: 2rem; color: var(--primary-color); font-weight: bold;">94%</p>
                            </div>
                        </div>
                    </div>
                `;
                break;
            default:
                content = '<p class="text-center">القسم غير متوفر حالياً</p>';
        }
        
        adminContent.innerHTML = content;
    }, 1000);
}

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // تحديث واجهة المستخدم
    updateUserInterface();
    setupNavigation();
    
    // إعداد نموذج تسجيل الدخول
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // إعداد أزرار تسجيل الخروج
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(button => {
        button.addEventListener('click', logout);
    });
    
    // إضافة تأثيرات الرسوم المتحركة
    const animatedElements = document.querySelectorAll('.card, .btn, .form-container');
    animatedElements.forEach((element, index) => {
        element.style.animationDelay = `${index * 0.1}s`;
        element.classList.add('fade-in');
    });
});

// وظائف إضافية للتفاعل
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    if (navMenu) {
        navMenu.classList.toggle('mobile-open');
    }
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// تصدير الوظائف للاستخدام العام
window.handleLogin = handleLogin;
window.logout = logout;
window.loadContent = loadContent;
window.loadAdminContent = loadAdminContent;
window.toggleMobileMenu = toggleMobileMenu;
window.scrollToSection = scrollToSection;


// تحديث إحصائيات المستخدم في الصفحة
async function updateUserStats() {
    const user = getCurrentUser();
    if (!user || !window.educationDB || !window.educationDB.db) return;

    try {
        const userStats = await window.educationDB.getUserStats(user.username);
        if (!userStats) return;

        // تحديث الإحصائيات في صفحة الطالب
        const statsElements = {
            'study-hours': userStats.totalStudyTime,
            'average-score': userStats.averageScore + '%',
            'completed-exercises': userStats.completedExercises,
            'completed-lessons': userStats.completedLessons
        };

        Object.entries(statsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // تحديث الإحصائيات في البطاقات
        const statCards = document.querySelectorAll('.stat-number');
        if (statCards.length >= 4) {
            statCards[0].textContent = userStats.totalStudyTime;
            statCards[1].textContent = userStats.averageScore + '%';
            statCards[2].textContent = userStats.completedExercises;
            statCards[3].textContent = userStats.completedLessons;
        }
    } catch (error) {
        console.error('خطأ في تحديث إحصائيات المستخدم:', error);
    }
}

// تحديث الإحصائيات العامة للإدارة
async function updateAdminStats() {
    if (!window.educationDB || !window.educationDB.db) return;

    try {
        const generalStats = await window.educationDB.getGeneralStats();
        
        // تحديث الإحصائيات في صفحة الإدارة
        const adminStatsElements = {
            'total-students': generalStats.totalStudents,
            'active-courses': generalStats.totalCourses,
            'success-rate': generalStats.successRate + '%',
            'attendance-rate': generalStats.attendanceRate + '%'
        };

        Object.entries(adminStatsElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // تحديث البطاقات الإحصائية
        const adminStatCards = document.querySelectorAll('.admin-stat-number');
        if (adminStatCards.length >= 4) {
            adminStatCards[0].textContent = generalStats.attendanceRate + '%';
            adminStatCards[1].textContent = generalStats.successRate + '%';
            adminStatCards[2].textContent = generalStats.totalCourses;
            adminStatCards[3].textContent = generalStats.totalStudents;
        }
    } catch (error) {
        console.error('خطأ في تحديث الإحصائيات العامة:', error);
    }
}

// تصدير الوظائف الجديدة
window.updateUserStats = updateUserStats;
window.updateAdminStats = updateAdminStats;
window.startLesson = startLesson;
window.startExercise = startExercise;

