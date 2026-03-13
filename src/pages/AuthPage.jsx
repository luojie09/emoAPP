import { useState } from 'react'

export default function AuthPage({ onAuth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    await onAuth({ email, password, isSignUp })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="w-full space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-medium text-gray-800">{isSignUp ? '注册账号' : '登录'}</h1>

        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="邮箱"
          className="w-full rounded-xl border border-gray-100 bg-white px-3 py-3 text-sm text-gray-700 focus:outline-none"
        />

        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="密码"
          className="w-full rounded-xl border border-gray-100 bg-white px-3 py-3 text-sm text-gray-700 focus:outline-none"
        />

        <button className="w-full rounded-xl bg-indigo-500 py-4 text-base font-medium text-white">
          {isSignUp ? '注册并登录' : '登录'}
        </button>

        <button
          type="button"
          onClick={() => setIsSignUp((prev) => !prev)}
          className="w-full rounded-xl bg-gray-100 py-3 text-sm font-medium text-gray-700"
        >
          {isSignUp ? '已有账号？去登录' : '没有账号？去注册'}
        </button>
      </form>
    </div>
  )
}
