const handleAuth = async ({ email, password, isSignUp }) => {
    // 🚑 修复：直接在对象身上调用方法，绝对不能提取成变量！
    let authResponse;
    
    if (isSignUp) {
      authResponse = await supabase.auth.signUp({ email, password });
    } else {
      authResponse = await supabase.auth.signInWithPassword({ email, password });
    }

    const { error } = authResponse;

    if (error) {
      showToast(error.message);
      return;
    }

    showToast(isSignUp ? '注册成功！' : '登录成功！');
    navigate('/');
  }
