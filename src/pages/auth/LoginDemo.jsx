import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/ui-new/button'
import { Input } from '@/components/ui-new/input'
import { Label } from '@/components/ui-new/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui-new/card'

export default function LoginDemo() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        console.log('Login with shadcn/ui:', { username, password })
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <LogIn className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
                    <CardDescription className="text-center">
                        Login with shadcn/ui components
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full">
                            Login
                        </Button>
                        <div className="space-y-2">
                            <Button variant="outline" className="w-full" type="button">
                                Secondary Button
                            </Button>
                            <Button variant="destructive" className="w-full" type="button">
                                Destructive Button
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6 pt-6 border-t">
                        <p className="text-sm text-center text-muted-foreground">
                            This is a demo using shadcn/ui components with Tailwind CSS
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
