'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import {
    BookOpen,
    Users,
    Award,
    Play,
    CheckCircle,
    ArrowRight,
    Star,
    TrendingUp,
    Shield,
    Clock,
    Globe
} from 'lucide-react';

export default function HomePage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // Redirect authenticated users to their dashboard
    useEffect(() => {
        if (!loading && user) {
            switch (user.role) {
                case 'admin':
                    router.push('/dashboard/admin');
                    break;
                case 'instructor':
                    router.push('/dashboard/instructor');
                    break;
                default:
                    router.push('/dashboard/student');
            }
        }
    }, [user, loading, router]);

    const features = [
        {
            icon: BookOpen,
            title: 'Rich Course Content',
            description: 'Access video lectures, PDFs, and interactive materials designed by expert instructors.'
        },
        {
            icon: Award,
            title: 'Earn Certificates',
            description: 'Complete courses and receive verified certificates to showcase your achievements.'
        },
        {
            icon: Users,
            title: 'Community Forums',
            description: 'Engage with peers and instructors through course-specific discussion forums.'
        },
        {
            icon: TrendingUp,
            title: 'Track Progress',
            description: 'Monitor your learning journey with detailed analytics and progress tracking.'
        },
        {
            icon: Shield,
            title: 'Secure Platform',
            description: 'Enterprise-grade security with MFA, encrypted data, and privacy protection.'
        },
        {
            icon: Clock,
            title: 'Learn at Your Pace',
            description: 'Flexible learning schedule that fits your lifestyle and commitments.'
        }
    ];

    const stats = [
        { value: '10,000+', label: 'Active Students' },
        { value: '500+', label: 'Expert Courses' },
        { value: '150+', label: 'Certified Instructors' },
        { value: '98%', label: 'Satisfaction Rate' }
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section className="pt-16 pb-20 px-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
                                <Star className="w-4 h-4" />
                                #1 E-Learning Platform
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                                Unlock Your
                                <span className="text-blue-600"> Learning </span>
                                Potential
                            </h1>
                            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                                Join thousands of learners mastering new skills with our comprehensive
                                courses, expert instructors, and interactive learning experience.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="/register"
                                    className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                                >
                                    Start Learning Free
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                                <Link
                                    href="/courses"
                                    className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition border border-gray-200"
                                >
                                    <Play className="w-5 h-5" />
                                    Browse Courses
                                </Link>
                            </div>
                            <div className="flex items-center gap-6 mt-8 pt-8 border-t border-gray-200">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                                        >
                                            {String.fromCharCode(64 + i)}
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-600">From 10,000+ happy learners</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative hidden lg:block">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-3xl rotate-3 opacity-20"></div>
                            <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <BookOpen className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Web Development</h3>
                                        <p className="text-sm text-gray-500">24 Lessons • 12 Hours</p>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-6">
                                    {['HTML & CSS Fundamentals', 'JavaScript Essentials', 'React Framework'].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 text-gray-700">
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full w-3/4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">75% Complete</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
                </div>
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Trusted by Learners Worldwide
                        </h2>
                        <p className="text-blue-200 text-lg max-w-2xl mx-auto">
                            Join our growing community of students and instructors achieving their goals
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300">
                                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                                    {stat.value}
                                </div>
                                <div className="text-blue-200 font-medium">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            Everything You Need to Succeed
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Our platform provides all the tools and resources you need for an effective learning experience.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition group"
                            >
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition">
                                    <feature.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 bg-gradient-to-br from-blue-600 to-indigo-700">
                <div className="max-w-4xl mx-auto text-center">
                    <Globe className="w-16 h-16 text-blue-200 mx-auto mb-6" />
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Start Your Learning Journey Today
                    </h2>
                    <p className="text-xl text-blue-100 mb-8">
                        Join our community of learners and get access to hundreds of courses, expert instructors, and a supportive community.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition"
                        >
                            Create Free Account
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            href="/courses"
                            className="inline-flex items-center justify-center gap-2 bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-400 transition border border-blue-400"
                        >
                            Explore Courses
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}